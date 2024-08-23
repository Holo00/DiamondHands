// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces/IDiamond.sol";

abstract contract DiamondCaller is Ownable {
    IDiamond diamondContract;
    address diamontContractAddress;

    constructor() Ownable() {}

    modifier onlyDiamond() {
        require(msg.sender == diamontContractAddress, "Only the Diamond contract can call this function");
        _;
    }

    function setDiamondTokenAddress(address _DiamondAddress) external onlyOwner{
        diamondContract = IDiamond(_DiamondAddress);
        diamontContractAddress = _DiamondAddress;
    }
}