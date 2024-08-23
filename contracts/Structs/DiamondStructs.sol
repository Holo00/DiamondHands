// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

struct HolderInfo{
    address add;
    Transaction[] txs;
    uint256 dipPoints;
    bool isDefined;
}

struct Transaction{
    uint256 qty;
    uint256 dipPointsPerUnit;
    uint256 ts;
}