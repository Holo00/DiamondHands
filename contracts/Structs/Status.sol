// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

struct Status{
    uint32 status;
    uint256 price;
    uint32 drawDown1;
    uint32 drawDown7;
    uint32 drawDown30;
    uint256 timeStamp;
}