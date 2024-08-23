// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

struct LotteryParticipant{
    address participant;
    uint256 tickets;
}

struct WinningResult{
    bool winning;
    uint256 winner;
}
