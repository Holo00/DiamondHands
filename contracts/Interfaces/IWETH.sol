// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}
