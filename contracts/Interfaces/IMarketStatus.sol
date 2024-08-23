// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../Structs/Status.sol";
import "../Structs/LiquidityPoolToMCAP.sol";

interface IMarketStatus {
    function getMarketStatus(address _address) external view returns (Status memory status);
    function getPoolToCap(address _address) external view returns (LiquidityPoolToMCAP memory ratio);
}