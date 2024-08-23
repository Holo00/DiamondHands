// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IDiamond is IERC20 {
    function burn(address _sender, uint256 _amount) external;
    function transferToLottery(address _from, address _to, uint256 _amount) external;
    function transferFromLottery(address _to, uint256 _amount) external;
}