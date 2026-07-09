// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {PolicyPool} from "./PolicyPool.sol";

/**
 * @title  ClaimsAdjudicator
 * @notice Turns a signed observation of a failed CAP order into a discharge, and
 *         cascades the recovery out of the reinsurer's pool on the way.
 *
 * ── Who is allowed to say the worker failed ──────────────────────────────────
 *
 * CAP already has the answer: an order reaches a terminal `rejected` or `expired`
 * status, on-chain, with a `rejectTxHash` and an `slaDeadline`. We do not need an
 * oracle to decide *whether* it failed. What we need is a way to get that fact
 * into this contract, and for now that is the Watcher: an off-chain process
 * holding `ATTESTOR_ROLE` that signs an EIP-712 `Attestation`.
 *
 * **The Watcher is trusted.** If it lies, or goes down, the system misbehaves. It
 * is written here rather than hidden because the roadmap — reading order status
 * straight from CAP's escrow contract — is what removes it, and until then anyone
 * reading this should know exactly where the trust sits. `threshold` exists so
 * that 1-of-1 can become k-of-n without touching this code.
 *
 * ── The hazard that is not about trusting the Watcher ────────────────────────
 *
 * The Client buys the policy. The Client calls `rejectOrder`. The Client collects
 * the discharge. The beneficiary controls the trigger — and no real book insures
 * a loss the beneficiary can simply declare. Left alone, a Client could hire a
 * worker, receive perfectly good work, reject it anyway, and be paid the coverage
 * on top of whatever CAP refunds from escrow.
 *
 * CAP hands us the discriminator for free, in a method we already call:
 *
 *   `expired`                        the worker blew `slaDeadline`. Nothing the
 *                                    Client did causes this.        → pay in full.
 *
 *   `rejected`, no `Delivery` row    the worker never submitted anything. A real
 *                                    delivery failure.              → pay in full.
 *
 *   `rejected`, `Delivery` submitted the worker delivered, and the Client refused
 *                                    it. That is a *quality dispute*, not a
 *                                    delivery failure.        → never auto-pay.
 *
 * So the attestation carries `deliverySubmitted` and the delivery's `contentHash`
 * — straight off `getDelivery(orderId)` — and the third case reverts. It is routed
 * to `dischargeDisputed`, which needs a human with `DISPUTE_RESOLVER_ROLE`. That
 * is a boundary, not a feature, and it is drawn deliberately: automating the one
 * case where the beneficiary controls the trigger is how the pool gets drained.
 *
 * Note what this buys. The Watcher could still lie and report `deliverySubmitted
 * = false`. But that moves the attack from "any client can arbitrage the pool,
 * silently, by exercising a right the protocol gives them" to "the Watcher must
 * commit provable fraud against an on-chain `contentHash` the worker can produce."
 * Those are very different trust surfaces, and only one of them is a business model.
 *
 * ── The cascade is best-effort, the discharge is not ─────────────────────────
 *
 * Recovery from the reinsurer is attempted first, so the cedent's book is never
 * briefly short. If the reinsurer cannot pay — insolvent, role revoked, treaty
 * already spent — that is the cedent's credit risk and it is logged, not thrown.
 * The client is paid either way. See `PolicyPool.discharge`.
 */
contract ClaimsAdjudicator is AccessControl, ReentrancyGuard, EIP712 {
    /* ── Roles ───────────────────────────────────────────────── */

    /// @notice Signs attestations. The Watcher.
    bytes32 public constant ATTESTOR_ROLE = keccak256("HALON_ATTESTOR");
    /// @notice Settles the one case this contract refuses to settle by itself.
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("HALON_DISPUTE_RESOLVER");

    /// @notice How long a signed observation stays usable.
    uint256 public constant ATTESTATION_TTL = 1 hours;

    /* ── Types ───────────────────────────────────────────────── */

    /// @dev The two terminal failure states CAP gives an order.
    enum Outcome {
        Rejected,
        Expired
    }

    struct Attestation {
        /// @dev The pool that wrote the policy.
        address pool;
        uint256 policyId;
        /// @dev Must equal the policy's own `insuredOrderId`. Binds the claim to the order.
        bytes32 insuredOrderId;
        Outcome outcome;
        /// @dev From `getDelivery(orderId)`: did the worker ever submit anything?
        bool deliverySubmitted;
        /// @dev The delivery's content hash, or zero when there was no delivery.
        bytes32 contentHash;
        /// @dev When the Watcher saw the event.
        uint256 observedAt;
    }

    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(address pool,uint256 policyId,bytes32 insuredOrderId,uint8 outcome,bool deliverySubmitted,bytes32 contentHash,uint256 observedAt)"
    );

    /* ── State ───────────────────────────────────────────────── */

    /// @notice Signatures required on an attestation. One today; raise it, not the code.
    uint256 public threshold = 1;

    mapping(bytes32 digest => bool) public attestationUsed;

    /* ── Events ──────────────────────────────────────────────── */

    event ThresholdChanged(uint256 threshold);
    event ClaimDischarged(
        address indexed pool, uint256 indexed policyId, Outcome outcome, uint256 indemnity, bytes32 digest
    );
    event CascadeRecovered(address indexed pool, uint256 indexed policyId, address reinsurer, uint256 recovered);
    /// @dev The reinsurer did not perform. The client was paid anyway.
    event CascadeFailed(address indexed pool, uint256 indexed policyId, address reinsurer, bytes reason);
    event DisputeDischarged(address indexed pool, uint256 indexed policyId, uint256 indemnity, string reason);

    /* ── Errors ──────────────────────────────────────────────── */

    error AttestationFromTheFuture(uint256 observedAt);
    error AttestationStale(uint256 observedAt);
    error AttestationAlreadyUsed(bytes32 digest);
    error InconsistentDelivery(bool deliverySubmitted, bytes32 contentHash);
    error NotEnoughSignatures(uint256 required, uint256 provided);
    error SignaturesNotStrictlyAscending();
    error NotAnAttestor(address signer);
    error PolicyNotArmed(address pool, uint256 policyId);
    error OrderPolicyMismatch(bytes32 policyOrderId, bytes32 attestedOrderId);
    error DeliveredThenRefused(address pool, uint256 policyId, bytes32 contentHash);
    error ThresholdMustBePositive();

    constructor(address admin) EIP712("HALON", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /* ── Admin ───────────────────────────────────────────────── */

    function setThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newThreshold == 0) revert ThresholdMustBePositive();
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    /* ── Views ───────────────────────────────────────────────── */

    /// @notice The EIP-712 digest the Watcher signs. Exposed so the agent can't guess wrong.
    function hashAttestation(Attestation calldata a) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTESTATION_TYPEHASH,
                    a.pool,
                    a.policyId,
                    a.insuredOrderId,
                    uint8(a.outcome),
                    a.deliverySubmitted,
                    a.contentHash,
                    a.observedAt
                )
            )
        );
    }

    /// @notice Would this observation be discharged without a human? See the header.
    function isAutoPayable(Attestation calldata a) public pure returns (bool) {
        return a.outcome == Outcome.Expired || !a.deliverySubmitted;
    }

    /* ── The claim ───────────────────────────────────────────── */

    /**
     * @notice Discharge a policy against a signed observation of its order failing.
     * @param  signatures Attestor signatures over `hashAttestation(a)`, ordered by
     *         ascending signer address. Ascending order is what makes them unique:
     *         `threshold` distinct attestors, not one attestor `threshold` times.
     */
    function discharge(Attestation calldata a, bytes[] calldata signatures)
        external
        nonReentrant
        returns (uint256 indemnity)
    {
        // forge-lint: disable-next-line(block-timestamp)
        if (a.observedAt > block.timestamp) revert AttestationFromTheFuture(a.observedAt);
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > a.observedAt + ATTESTATION_TTL) revert AttestationStale(a.observedAt);

        // A delivery has a hash, and a hash implies a delivery. Anything else is a
        // malformed observation and we will not reason about it.
        if (a.deliverySubmitted == (a.contentHash == bytes32(0))) {
            revert InconsistentDelivery(a.deliverySubmitted, a.contentHash);
        }

        bytes32 digest = hashAttestation(a);
        _verifySignatures(digest, signatures);

        if (attestationUsed[digest]) revert AttestationAlreadyUsed(digest);
        attestationUsed[digest] = true;

        PolicyPool pool = PolicyPool(a.pool);
        PolicyPool.Policy memory p = pool.policy(a.policyId);
        if (p.status != PolicyPool.Status.Armed) revert PolicyNotArmed(a.pool, a.policyId);
        // Without this, an attestation about *any* failed order would discharge *any*
        // armed policy. The claim has to be about the order the policy actually covers.
        if (p.insuredOrderId != a.insuredOrderId) revert OrderPolicyMismatch(p.insuredOrderId, a.insuredOrderId);

        // The worker delivered and the client refused it. The beneficiary does not
        // get to declare its own loss. A human decides this one, or nobody does.
        if (!isAutoPayable(a)) revert DeliveredThenRefused(a.pool, a.policyId, a.contentHash);

        indemnity = _settleClaim(pool, a.policyId, p);
        emit ClaimDischarged(a.pool, a.policyId, a.outcome, indemnity, digest);
    }

    /**
     * @notice Settle the case `discharge` refuses to: the worker delivered, the
     *         client refused, and somebody with standing has adjudicated it.
     * @dev    This is the manual escape hatch, and it is the honest boundary of the
     *         MVP. A real system replaces the role with a challenge window in which
     *         the worker can post the `contentHash` it delivered, and a market or a
     *         court of some kind resolves it. We are not pretending to have that.
     */
    function dischargeDisputed(address pool, uint256 policyId, string calldata reason)
        external
        onlyRole(DISPUTE_RESOLVER_ROLE)
        nonReentrant
        returns (uint256 indemnity)
    {
        PolicyPool p = PolicyPool(pool);
        PolicyPool.Policy memory policy = p.policy(policyId);
        if (policy.status != PolicyPool.Status.Armed) revert PolicyNotArmed(pool, policyId);

        indemnity = _settleClaim(p, policyId, policy);
        emit DisputeDischarged(pool, policyId, indemnity, reason);
    }

    /* ── Internals ───────────────────────────────────────────── */

    function _verifySignatures(bytes32 digest, bytes[] calldata signatures) internal view {
        uint256 required = threshold;
        if (signatures.length < required) revert NotEnoughSignatures(required, signatures.length);

        address previous = address(0);
        for (uint256 i = 0; i < signatures.length; ++i) {
            address signer = ECDSA.recover(digest, signatures[i]);
            // Strictly ascending, so no signer can be counted twice.
            if (signer <= previous) revert SignaturesNotStrictlyAscending();
            if (!hasRole(ATTESTOR_ROLE, signer)) revert NotAnAttestor(signer);
            previous = signer;
        }
    }

    /**
     * @dev Cascade first, then pay. Collecting before paying means the cedent's book
     *      is never momentarily short — but a reinsurer that cannot pay must not be
     *      able to stop the client from being paid. So the recovery is a `try`, and
     *      the discharge is not.
     */
    function _settleClaim(PolicyPool pool, uint256 policyId, PolicyPool.Policy memory p)
        internal
        returns (uint256 indemnity)
    {
        if (p.reinsurer != address(0)) {
            try PolicyPool(p.reinsurer).discharge(p.reinsurancePolicyId) returns (uint256 recovered) {
                pool.creditRecovery(policyId, recovered);
                emit CascadeRecovered(address(pool), policyId, p.reinsurer, recovered);
            } catch (bytes memory reason) {
                emit CascadeFailed(address(pool), policyId, p.reinsurer, reason);
            }
        }
        indemnity = pool.discharge(policyId);
    }
}
