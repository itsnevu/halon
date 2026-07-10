// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {RiskEngine} from "./RiskEngine.sol";

/**
 * @title  PolicyPool
 * @notice A USDC vault that writes cover on agents, mints each policy as an
 *         ERC-721, and pays claims without asking anyone.
 *
 * One contract serves both layers. Pool A writes cover for clients; Pool B
 * reinsures Pool A. A reinsurance treaty is not a special type here — it is an
 * ordinary policy in Pool B whose beneficiary happens to be Pool A's address.
 * That is why `PolicyPool` implements `IERC721Receiver`: it holds its own
 * treaties as NFTs, the same instrument its clients hold.
 *
 * ── Premium arrives before we know about it ──────────────────────────────────
 *
 * CAP's pay transaction transfers `fundAmount` of USDC straight to
 * `providerFundAddress`, which we set to this contract. That is a plain ERC-20
 * transfer: there is no hook, no callback, nothing this contract can run at the
 * moment the money lands. So the pool reconciles by balance delta instead —
 * `_sync()` sweeps anything unaccounted into `pendingInflow`, and `bind` refuses
 * to write a policy whose premium has not actually shown up. The atomicity the
 * README claims is real, but it is CAP's atomicity, not ours: we can only verify
 * afterwards, and we do.
 *
 * ── Capital is locked gross, then released against a verified treaty ─────────
 *
 * At bind the pool locks the *full* coverage. It has no reinsurance yet, so it
 * is on the hook for all of it. When `attachReinsurance` is called it does not
 * take the underwriter's word for the cede: it reads the treaty out of the
 * reinsurer's own storage, checks that this pool holds the treaty NFT, that the
 * treaty is armed, and that it does not lapse before the policy does. Only then
 * does it release `cededCoverage` back into free capital.
 *
 * The result is that Pool A locks its retention and Pool B locks the ceded share
 * — together exactly the coverage, never more. Reinsurance buys capacity, which
 * is the entire point of buying it.
 *
 * ── What this contract does not do ───────────────────────────────────────────
 *
 * There are no LP shares. Capital belongs to whoever holds `CAPITAL_ROLE`, and
 * withdrawals are bounded by free capital. A pooled, share-based vault has to
 * price locked capital and pending claims into the share price, and getting that
 * subtly wrong is worse than not shipping it.
 *
 * The Watcher is trusted. `ADJUDICATOR_ROLE` can discharge any armed policy.
 * `ClaimsAdjudicator` is what will hold that role, and it is the contract that
 * has to decide what evidence a discharge requires. See README.
 */
contract PolicyPool is ERC721, AccessControlDefaultAdminRules, ReentrancyGuard, Pausable, IERC721Receiver {
    using SafeERC20 for IERC20;

    /* ── Roles ───────────────────────────────────────────────── */

    /// @notice Binds policies and executes the cede. The Underwriter Agent's wallet.
    bytes32 public constant UNDERWRITER_ROLE = keccak256("HALON_UNDERWRITER");
    /// @notice Discharges claims. `ClaimsAdjudicator`.
    bytes32 public constant ADJUDICATOR_ROLE = keccak256("HALON_ADJUDICATOR");
    /// @notice Deposits and withdraws pool capital.
    bytes32 public constant CAPITAL_ROLE = keccak256("HALON_CAPITAL");

    /// @notice Grace period after expiry in which a claim may still be attested.
    /// @dev An order can fail in the last second of cover; the Watcher needs a
    ///      moment to see it, sign it and land the transaction.
    uint256 public constant CLAIM_WINDOW = 1 hours;

    /* ── Wiring ──────────────────────────────────────────────── */

    IERC20 public immutable usdc;
    RiskEngine public immutable riskEngine;

    /* ── Types ───────────────────────────────────────────────── */

    /// @dev `None` is the zero value, so an unwritten policy is never `Armed`.
    enum Status {
        None,
        Armed,
        Discharged,
        Settled
    }

    /// @dev `Direct` is cover sold to a client. `Treaty` is cover sold to another pool.
    enum Kind {
        Direct,
        Treaty
    }

    struct Policy {
        Status status;
        Kind kind;
        /// @dev Who the NFT was minted to. The *current* holder is paid on discharge.
        address beneficiary;
        uint256 coverage;
        uint256 premium;
        /// @dev Zero until a treaty is attached and verified.
        uint256 cededCoverage;
        address reinsurer;
        uint256 reinsurancePolicyId;
        bool cededPremiumDrawn;
        uint256 boundAt;
        uint256 expiresAt;
        /// @dev Pricing is a snapshot. What the agent's index was when we quoted.
        uint256 reliabilityAtBindBps;
        bytes32 insuredOrderId;
        bytes32 insuredAgentId;
    }

    struct BindParams {
        address beneficiary;
        uint256 coverage;
        uint256 premium;
        uint256 tenorHours;
        uint256 reliabilityBps;
        /**
         * @dev `keccak256(capOrderId)` of the **job being insured** — the order the
         *      Client opened against the Worker — and *not* the order through which
         *      the coverage itself was bought. `ClaimsAdjudicator` matches the
         *      Watcher's attestation against this field, so a policy that names the
         *      wrong order can never pay out.
         *
         *      It follows that the job order must exist before the policy is bound.
         *      In CAP terms: negotiate the hire, buy cover naming that order id, then
         *      pay the hire. Cover is armed before the job is funded, which is the
         *      right way round anyway.
         *
         *      For a `Treaty` nothing matches against it; it is the cede order, and it
         *      serves only to stop the same cede being written twice.
         */
        bytes32 insuredOrderId;
        bytes32 insuredAgentId;
    }

    /* ── Book ────────────────────────────────────────────────── */

    /// @notice USDC recognised as pool capital.
    uint256 public totalCapital;
    /// @notice Capital reserved against armed policies. Never exceeds `totalCapital`.
    uint256 public lockedCapital;
    /// @notice USDC that has arrived but has not been bound to a policy yet.
    uint256 public pendingInflow;

    uint256 public premiumsEarned;
    uint256 public cededPremiumsPaid;
    uint256 public claimsPaid;
    uint256 public recoveredTotal;

    /**
     * @notice Where `drawCededPremium` sends the money: the Underwriter Agent's CAP
     *         wallet, which is the account CAP will debit when it pays the
     *         reinsurance order.
     * @dev    Set by the admin, not by the caller. `UNDERWRITER_ROLE` decides *when*
     *         a cede happens; it never decides where the money goes. That key lives
     *         hot in an agent process, and this is the only function that moves USDC
     *         out of the pool without a claim behind it.
     */
    address public cedeRecipient;

    /**
     * @notice Treaties this pool has already leaned on.
     * @dev    `AlreadyReinsured` guards a policy against having two treaties. This
     *         guards a treaty against backing two policies — without it, attaching
     *         the same treaty twice releases `cededCoverage` twice, and the pool
     *         writes more cover than the layer beneath it is standing behind. The
     *         money is still there; the capacity is not.
     */
    mapping(address reinsurer => mapping(uint256 treatyId => bool)) public treatyAttached;

    uint256 public nextPolicyId;
    mapping(uint256 policyId => Policy) private _policies;
    /// @notice Insured CAP order → policy id. One policy per job. Ids start at 1, so
    ///         zero means "no policy", which is what the double-bind guard reads.
    mapping(bytes32 insuredOrderId => uint256 policyId) public policyByInsuredOrder;

    /* ── Events ──────────────────────────────────────────────── */

    event PremiumSynced(uint256 amount, uint256 pendingInflow);
    event PolicyBound(
        uint256 indexed policyId,
        address indexed beneficiary,
        Kind kind,
        uint256 coverage,
        uint256 premium,
        uint256 expiresAt,
        bytes32 insuredOrderId
    );
    event CededPremiumDrawn(uint256 indexed policyId, address indexed to, uint256 amount);
    event ReinsuranceAttached(
        uint256 indexed policyId, address indexed reinsurer, uint256 treatyId, uint256 cededCoverage
    );
    event Discharged(uint256 indexed policyId, address indexed to, uint256 indemnity);
    event RecoveryCredited(uint256 indexed policyId, uint256 amount);
    event PolicySettled(uint256 indexed policyId, uint256 released);
    event CapitalDeposited(address indexed from, uint256 amount);
    event CapitalWithdrawn(address indexed to, uint256 amount);
    event InflowAbsorbed(uint256 amount);
    event CedeRecipientChanged(address indexed recipient);

    /* ── Errors ──────────────────────────────────────────────── */

    error ZeroCoverage();
    error OrderAlreadyInsured(bytes32 insuredOrderId);
    error NotInsurable(RiskEngine.Decline reason);
    error PremiumBelowTechnicalRate(uint256 required, uint256 offered);
    error PremiumBelowExpectedLoss(uint256 required, uint256 offered);
    error PremiumNotReceived(uint256 required, uint256 available);
    error InsufficientFreeCapital(uint256 required, uint256 available);
    error PolicyNotArmed(uint256 policyId);
    error ClaimWindowClosed(uint256 policyId);
    error ClaimWindowOpen(uint256 policyId);
    error AlreadyReinsured(uint256 policyId);
    error TreatyAlreadyAttached(address reinsurer, uint256 treatyId);
    error CededPremiumAlreadyDrawn(uint256 policyId);
    error CedeRecipientUnset();
    error SelfReinsurance();
    error TreatyNotHeld(address reinsurer, uint256 treatyId);
    error TreatyNotArmed(uint256 treatyId);
    error TreatyExceedsCoverage(uint256 ceded, uint256 coverage);
    error TreatyLapsesFirst(uint256 treatyExpiry, uint256 policyExpiry);
    error NothingToCredit(uint256 requested, uint256 available);
    error PoolInsolvent(uint256 needed, uint256 capital);

    constructor(IERC20 usdc_, RiskEngine riskEngine_, address admin, string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        AccessControlDefaultAdminRules(0, admin)
    {
        usdc = usdc_;
        riskEngine = riskEngine_;
    }

    /* ── Views ───────────────────────────────────────────────── */

    function policy(uint256 policyId) external view returns (Policy memory) {
        return _policies[policyId];
    }

    /// @notice Coverage this pool carries alone, after the cede.
    function retentionOf(uint256 policyId) public view returns (uint256) {
        Policy storage p = _policies[policyId];
        return p.coverage - p.cededCoverage;
    }

    /**
     * @notice Capital not reserved against an armed policy.
     * @dev    Saturates at zero rather than underflowing. A pool *can* end up with
     *         `lockedCapital > totalCapital`: `discharge` pays the full coverage
     *         but only releases the retention, so a claim paid before its cascade
     *         recovery has been credited leaves the book short. That is a real
     *         state, and it must be readable — not a revert that bricks every view
     *         and every write on the contract.
     */
    function freeCapital() public view returns (uint256) {
        return lockedCapital >= totalCapital ? 0 : totalCapital - lockedCapital;
    }

    /// @notice Armed exposure exceeds capital. No new cover can be written until it heals.
    function underReserved() external view returns (bool) {
        return lockedCapital > totalCapital;
    }

    /// @notice Utilization the RiskEngine prices against. Same function, one source.
    function utilizationBps() public view returns (uint256) {
        return riskEngine.poolUtilization(lockedCapital, totalCapital);
    }

    /// @notice What this pool would charge right now. What the agent calls before quoting.
    function quoteFor(uint256 reliabilityBps, uint256 coverage, uint256 tenorHours)
        external
        view
        returns (RiskEngine.Quote memory)
    {
        return riskEngine.quote(reliabilityBps, coverage, tenorHours, utilizationBps());
    }

    /* ── Admin ───────────────────────────────────────────────── */

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Point the cede at the Underwriter Agent's CAP wallet. Admin only.
    function setCedeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        cedeRecipient = recipient;
        emit CedeRecipientChanged(recipient);
    }

    /* ── Capital ─────────────────────────────────────────────── */

    function depositCapital(uint256 amount) external onlyRole(CAPITAL_ROLE) nonReentrant whenNotPaused {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalCapital += amount;
        emit CapitalDeposited(msg.sender, amount);
    }

    /// @notice Locked capital is not yours to take. Armed policies come first.
    function withdrawCapital(uint256 amount, address to) external onlyRole(CAPITAL_ROLE) nonReentrant whenNotPaused {
        uint256 free = freeCapital();
        if (amount > free) revert InsufficientFreeCapital(amount, free);
        totalCapital -= amount;
        usdc.safeTransfer(to, amount);
        emit CapitalWithdrawn(to, amount);
    }

    /// @notice Recognise USDC that arrived out of band. Callable by anyone; it can
    ///         only ever move money *into* the pool's own accounting.
    function sync() public {
        uint256 balance = usdc.balanceOf(address(this));
        uint256 accounted = totalCapital + pendingInflow;
        if (balance > accounted) {
            uint256 delta = balance - accounted;
            pendingInflow += delta;
            emit PremiumSynced(delta, pendingInflow);
        }
    }

    /// @notice Turn unbound inflow (a donation, an uncredited recovery) into capital.
    function absorbInflow() external onlyRole(CAPITAL_ROLE) {
        sync();
        uint256 amount = pendingInflow;
        pendingInflow = 0;
        totalCapital += amount;
        emit InflowAbsorbed(amount);
    }

    /* ── Writing cover ───────────────────────────────────────── */

    /**
     * @notice Write cover for a client. The premium must already have landed.
     * @dev    Priced at the pool's utilization *before* this premium is booked,
     *         which is the same number the dashboard quoted from.
     *
     *         The premium must clear the engine's full technical rate. This pool
     *         will not underwrite below its own model, whatever the agent thinks.
     */
    function bindDirect(BindParams calldata p)
        external
        onlyRole(UNDERWRITER_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256 policyId)
    {
        return _bind(p, Kind.Direct);
    }

    /**
     * @notice Reinsure another pool's retention: an ordinary policy whose
     *         beneficiary is that pool.
     * @dev    A treaty is *not* priced at this pool's retail rate. The cedent pays
     *         `cededShare × (1 − cedingCommission)` of a premium that was already
     *         loaded once, and it carries no second expense fee — so the retail
     *         quote for the ceded layer will usually sit above what arrives.
     *
     *         What the treaty must clear is the reinsurer's own expected loss on
     *         the layer it takes. That is exactly `RiskEngine`'s loading guard
     *         (`premium × (1 − commission) >= expectedLoss`) seen from this side
     *         of the treaty, so a policy the cedent was allowed to write is always
     *         a treaty this pool is allowed to accept.
     */
    function bindTreaty(BindParams calldata p)
        external
        onlyRole(UNDERWRITER_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256 policyId)
    {
        return _bind(p, Kind.Treaty);
    }

    function _bind(BindParams calldata p, Kind kind) internal returns (uint256 policyId) {
        if (p.coverage == 0) revert ZeroCoverage();
        if (policyByInsuredOrder[p.insuredOrderId] != 0) revert OrderAlreadyInsured(p.insuredOrderId);

        RiskEngine.Quote memory q = riskEngine.quote(p.reliabilityBps, p.coverage, p.tenorHours, utilizationBps());
        if (!q.insurable) revert NotInsurable(q.decline);

        if (kind == Kind.Direct) {
            if (p.premium < q.premium) revert PremiumBelowTechnicalRate(q.premium, p.premium);
        } else if (p.premium < q.expectedLoss) {
            revert PremiumBelowExpectedLoss(q.expectedLoss, p.premium);
        }

        // The money is already here, or there is no policy.
        sync();
        if (pendingInflow < p.premium) revert PremiumNotReceived(p.premium, pendingInflow);
        pendingInflow -= p.premium;
        totalCapital += p.premium;
        premiumsEarned += p.premium;

        // No reinsurance yet, so the pool is on the hook for the whole thing.
        uint256 free = freeCapital();
        if (free < p.coverage) revert InsufficientFreeCapital(p.coverage, free);
        lockedCapital += p.coverage;

        policyId = ++nextPolicyId;
        uint256 expiresAt = block.timestamp + p.tenorHours * 1 hours;

        _policies[policyId] = Policy({
            status: Status.Armed,
            kind: kind,
            beneficiary: p.beneficiary,
            coverage: p.coverage,
            premium: p.premium,
            cededCoverage: 0,
            reinsurer: address(0),
            reinsurancePolicyId: 0,
            cededPremiumDrawn: false,
            boundAt: block.timestamp,
            expiresAt: expiresAt,
            reliabilityAtBindBps: p.reliabilityBps,
            insuredOrderId: p.insuredOrderId,
            insuredAgentId: p.insuredAgentId
        });
        policyByInsuredOrder[p.insuredOrderId] = policyId;

        emit PolicyBound(policyId, p.beneficiary, kind, p.coverage, p.premium, expiresAt, p.insuredOrderId);
        _safeMint(p.beneficiary, policyId);
    }

    /* ── Ceding ──────────────────────────────────────────────── */

    /**
     * @notice Release this policy's ceded premium to the Underwriter Agent's CAP
     *         wallet, so it can pay the reinsurance order.
     * @dev    The money has to pass through that wallet: CAP's pay transaction is
     *         signed by the agent's custodial account, not by this contract and not
     *         by the key that holds `UNDERWRITER_ROLE`. Two things are therefore not
     *         the caller's to choose — the destination, which the admin sets, and the
     *         amount, which comes out of this policy's premium and the engine's own
     *         treaty constants. It can be drawn exactly once.
     */
    function drawCededPremium(uint256 policyId)
        external
        onlyRole(UNDERWRITER_ROLE)
        nonReentrant
        returns (uint256 amount)
    {
        address to = cedeRecipient;
        if (to == address(0)) revert CedeRecipientUnset();

        Policy storage p = _policies[policyId];
        if (p.status != Status.Armed) revert PolicyNotArmed(policyId);
        if (p.cededPremiumDrawn) revert CededPremiumAlreadyDrawn(policyId);

        uint256 bps = riskEngine.BPS();
        amount = (p.premium * riskEngine.CEDED_SHARE_BPS() * (bps - riskEngine.CEDING_COMMISSION_BPS())) / (bps * bps);

        uint256 free = freeCapital();
        if (amount > free) revert InsufficientFreeCapital(amount, free);

        p.cededPremiumDrawn = true;
        totalCapital -= amount;
        cededPremiumsPaid += amount;

        usdc.safeTransfer(to, amount);
        emit CededPremiumDrawn(policyId, to, amount);
    }

    /**
     * @notice Point a policy at the treaty that backs it, and release the ceded
     *         capital.
     * @dev    We do not trust the caller about any of this. The treaty is read out
     *         of the reinsurer's storage: it must be armed, this pool must hold its
     *         NFT, it cannot exceed the coverage it backs, and it cannot lapse
     *         before the policy does — cover that expires first is not cover.
     */
    function attachReinsurance(uint256 policyId, address reinsurer, uint256 treatyId)
        external
        onlyRole(UNDERWRITER_ROLE)
        nonReentrant
    {
        Policy storage p = _policies[policyId];
        if (p.status != Status.Armed) revert PolicyNotArmed(policyId);
        if (p.reinsurer != address(0)) revert AlreadyReinsured(policyId);
        if (reinsurer == address(this) || reinsurer == address(0)) revert SelfReinsurance();
        // One treaty backs one policy. See `treatyAttached`.
        if (treatyAttached[reinsurer][treatyId]) revert TreatyAlreadyAttached(reinsurer, treatyId);

        PolicyPool re = PolicyPool(reinsurer);
        if (re.ownerOf(treatyId) != address(this)) revert TreatyNotHeld(reinsurer, treatyId);

        Policy memory t = re.policy(treatyId);
        if (t.status != Status.Armed) revert TreatyNotArmed(treatyId);
        if (t.coverage == 0 || t.coverage > p.coverage) revert TreatyExceedsCoverage(t.coverage, p.coverage);
        if (t.expiresAt < p.expiresAt) revert TreatyLapsesFirst(t.expiresAt, p.expiresAt);

        treatyAttached[reinsurer][treatyId] = true;
        p.reinsurer = reinsurer;
        p.reinsurancePolicyId = treatyId;
        p.cededCoverage = t.coverage;

        lockedCapital -= t.coverage;
        emit ReinsuranceAttached(policyId, reinsurer, treatyId, t.coverage);
    }

    /* ── Claims ──────────────────────────────────────────────── */

    /**
     * @notice Pay the policy in full to whoever holds it. Nobody votes on this.
     * @dev    Returns the indemnity so the adjudicator can cascade: discharging a
     *         treaty in Pool B pays Pool A, and `creditRecovery` books it there.
     *
     *         Deliberately *not* conditional on the cascade having happened. The
     *         cedent owes the client whether or not the reinsurer performs — the
     *         recovery is a receivable, not a precondition. A pool that discharges
     *         ahead of its recovery is briefly under-reserved, which `freeCapital`
     *         reports as zero and `underReserved` reports as true. It stops writing
     *         new cover; it does not stop paying.
     */
    function discharge(uint256 policyId) external onlyRole(ADJUDICATOR_ROLE) nonReentrant returns (uint256 indemnity) {
        Policy storage p = _policies[policyId];
        if (p.status != Status.Armed) revert PolicyNotArmed(policyId);
        // Base's sequencer stamps the block. A window measured in hours is not
        // something anyone can meaningfully drift.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > p.expiresAt + CLAIM_WINDOW) revert ClaimWindowClosed(policyId);

        p.status = Status.Discharged;
        indemnity = p.coverage;

        lockedCapital -= (p.coverage - p.cededCoverage);
        if (totalCapital < indemnity) revert PoolInsolvent(indemnity, totalCapital);
        totalCapital -= indemnity;
        claimsPaid += indemnity;

        address to = ownerOf(policyId);
        usdc.safeTransfer(to, indemnity);
        emit Discharged(policyId, to, indemnity);
    }

    /// @notice Book a cascade recovery that has landed from the reinsurer's pool.
    function creditRecovery(uint256 policyId, uint256 amount) external onlyRole(ADJUDICATOR_ROLE) {
        sync();
        if (pendingInflow < amount) revert NothingToCredit(amount, pendingInflow);
        pendingInflow -= amount;
        totalCapital += amount;
        recoveredTotal += amount;
        emit RecoveryCredited(policyId, amount);
    }

    /// @notice Cover ran to term with no claim. Release the capital. Anyone may call.
    function settle(uint256 policyId) external returns (uint256 released) {
        Policy storage p = _policies[policyId];
        if (p.status != Status.Armed) revert PolicyNotArmed(policyId);
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp <= p.expiresAt + CLAIM_WINDOW) revert ClaimWindowOpen(policyId);

        p.status = Status.Settled;
        released = p.coverage - p.cededCoverage;
        lockedCapital -= released;
        emit PolicySettled(policyId, released);
    }

    /* ── Plumbing ────────────────────────────────────────────── */

    /// @dev This pool holds its own reinsurance treaties, which are ERC-721s.
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControlDefaultAdminRules) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
