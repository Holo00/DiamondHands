// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Diamond.sol";

abstract contract DiamondCaller is Ownable {
    IDiamond diamondContract;
    address diamontContractAddress;

    constructor(address _owner) Ownable(_owner) 
    {
        
    }

    modifier onlyDiamond() {
        require(msg.sender == diamondContract, "Only the Diamond contract can call this function");
        _;
    }

    function setDiamondTokenAddress(address _DiamondAddress) external onlyOwner{
        diamondContract = IDiamond(_DiamondAddress);
        diamontContractAddress = _DiamondAddress;
    }
}