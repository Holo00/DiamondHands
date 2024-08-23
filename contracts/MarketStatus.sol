// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces/IMarketStatus.sol";
import "./Structs/Status.sol";
import "./Structs/LiquidityPoolToMCAP.sol";


contract MarketStatus is IMarketStatus, Ownable {
    mapping(address => Status) public marketStatus;
    mapping(address => LiquidityPoolToMCAP) public poolToCap;

    constructor() Ownable() {}

    function getMarketStatus(address _address) external override view returns (Status memory status) {
        require(marketStatus[_address].price > 0, 'Status not defined');
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