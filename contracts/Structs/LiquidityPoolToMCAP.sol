// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

struct LiquidityPoolToMCAP {
    uint32 ratio;
    address[] liquidityProvidersAddresses;
    uint256 timeStamp;
}