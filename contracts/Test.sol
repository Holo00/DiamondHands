// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MarketStatus.sol";
import "./SwapHelper.sol";



interface IB{
    function doStuff() external;
}

contract A {
    IB b;

    constructor(address _bAddress){
        b =IB(_bAddress);
    }

    function callContractB() external {
        b.doStuff();
    }
}

contract B {
    address aAddress;

    constructor(address _aAddress){
        aAddress =_aAddress;
    }

    modifier onlyA() {
        require(msg.sender == aAddress, "Only the A contract can call this function");
        _;
    }

    function doStuff() external onlyA {
        msg.sender = ???
    }
}