// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts502/access/Ownable.sol";

struct LiquidityPoolToMCAP {
    uint32 ratio;
    address[] liquidityProvidersAddresses;
    uint256 timeStamp;
}

struct Status{
    uint32 status;
    uint256 price;
    uint32 drawDown1;
    uint32 drawDown7;
    uint32 drawDown30;
    uint256 timeStamp;
}

interface IMarketStatus {
    function getMarketStatus(address _address) external view returns (Status memory status);
    function getPoolToCap(address _address) external view returns (LiquidityPoolToMCAP memory ratio);
}

contract MarketStatus is IMarketStatus, Ownable {
    mapping(address => Status) public marketStatus;
    mapping(address => LiquidityPoolToMCAP) public poolToCap;

    constructor(address owner) Ownable(owner) 
    {

    }

    function getMarketStatus(address _address) external override view returns (Status memory status) {
        return marketStatus[_address];
    }

    function getPoolToCap(address _address) external override view returns (LiquidityPoolToMCAP memory ratio) {
        return poolToCap[_address];
    }

    function setLiquidityPoolToMCAP(
        address _token, 
        uint32 _ratio, 
        address[] calldata _liquidityProvidersAddresses,
        uint256 _timeStamp) external onlyOwner returns(bool) {
        LiquidityPoolToMCAP memory ratio = LiquidityPoolToMCAP(_ratio, _liquidityProvidersAddresses, _timeStamp);
        poolToCap[_token] = ratio;
        return true;
    }

    function setMarketStatus(
        address _token, 
        uint32 _status,
        uint256 _price,
        uint32 _drawDown1,
        uint32 _drawDown7,
        uint32 _drawDown30,
        uint256 _timeStamp) external onlyOwner returns(bool) {
        Status memory status = Status(_status, _price, _drawDown1, _drawDown7, _drawDown30, _timeStamp);
        marketStatus[_token] = status;
        return true;
    }
}