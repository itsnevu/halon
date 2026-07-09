// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PolicyPool} from "../../src/PolicyPool.sol";

/**
 * A "pool" that lies. Its `policy()` reports an armed policy whose reinsurer is a
 * *real* pool and whose treaty id is a real, armed treaty in it.
 *
 * If `ClaimsAdjudicator` acted on any address an attestation named, it would call
 * `discharge` on that real treaty — holding `ADJUDICATOR_ROLE` — and burn the
 * reinsurer's capital on a policy that never existed. Only the signature would be
 * needed, and the signature is one leaked key away.
 */
contract HostilePool {
    address public immutable realReinsurer;
    uint256 public immutable realTreatyId;
    bytes32 public immutable insuredOrderId;

    constructor(address realReinsurer_, uint256 realTreatyId_, bytes32 insuredOrderId_) {
        realReinsurer = realReinsurer_;
        realTreatyId = realTreatyId_;
        insuredOrderId = insuredOrderId_;
    }

    function policy(uint256) external view returns (PolicyPool.Policy memory p) {
        p.status = PolicyPool.Status.Armed;
        p.kind = PolicyPool.Kind.Direct;
        p.beneficiary = address(this);
        p.coverage = 1;
        p.reinsurer = realReinsurer;
        p.reinsurancePolicyId = realTreatyId;
        p.insuredOrderId = insuredOrderId;
    }

    function creditRecovery(uint256, uint256) external {}

    function discharge(uint256) external pure returns (uint256) {
        return 1;
    }
}
