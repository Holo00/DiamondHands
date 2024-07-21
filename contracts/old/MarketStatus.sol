// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Airnode.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct MarketStatus{
    string marketStatus,
    uint256 price,
    uint8 drawDown1,
    uint8 drawDown7,
    uint8 drawDown30
}

struct PriceFeed{
    uint256 price
}

interface IMarketStatus {
    function requestTokenPrices() external returns (bytes32 result);
    function requestMarketStatuses() external returns (bytes32 result);
    function tokenPriceRequestIds(address _address) external view returns (address tokenRequestId);
    function marketStatusRequestIds(address _address) external view returns (address tokenRequestId);
    function priceFeeds(address _address) external view returns (uint256 price);
    function marketStatus(address _address) external view returns (MarketStatus status);
    function setAllPrices() external returns(bool);
    function setAllMarketStatus() external returns(bool);
    function tokensForPriceFeeds() external view returns (address[] tokens);
    function tokensAddressForMarketStatus() external view returns (address[] tokens);
}


contract MarketStatus is IMarketStatus, Ownable {
    IAirnode airnodeContract;

    int8 waitingForPriceUpdates;
    int8 waitingForStatusUpdates;

    mapping(address => address) public tokenPriceRequestIds; // token address => Airnode price results
    mapping(address => address) public marketStatusRequestIds; // token address => Airnode price results
    mapping(address => uint) public priceFeeds; // price feed results
    mapping(address => MarketStatus) public marketStatus;

    address[] public tokensForPriceFeeds;
    address[] public tokensAddressForMarketStatus;

    bytes32 tokenPriceFeedEndpoinId;
    bytes32 marketStatusEndpointId;

    event TokenForPriceFeedsAdded(address indexed token);
    event TokenPriceRequested(address indexed token, bytes32 indexed requestId);
    event MarketStatusRequested(address indexed token, bytes32 indexed requestId);
    event TokenPriceUpdated(address indexed token, uint256 price);
    event MarketStatusUpdated(address indexed token, MarketStatus status);

    address sponsor;
    address sponsorWallet;


    constructor(bytes32 _tokenPriceFeedEndpoinId, 
        bytes32 _marketStatusEndpointId, 
        address _sponsor, 
        address _sponsorWallet,
        address _airnodeContractAddress) Ownable() 
    {
        tokenPriceFeedEndpoinId = _tokenPriceFeedEndpoinId;
        marketStatusEndpointId = _marketStatusEndpointId;
        sponsor = _sponsor;
        sponsorWallet = _sponsorWallet;
        airnodeContract = IAirnode(_airnodeContractAddress);
        waitingForPriceUpdates = 0;
        waitingForStatusUpdates = 0;
    }

    addTokenAddressForMarketStatus(address _token) external onlyOwner returns(bool) {
        tokenAddressForMarketStatus = _token;
    }

    addTokenAddressForPriceFeed(address _token) external onlyOwner  returns(bool) {
        bool tokenExists = false;
        for (uint256 i = 0; i < tokensForPriceFeeds.length; i++) {
            if (tokensForPriceFeeds[i] == _token) {
                tokenExists = true;
                break;
            }
        }
        if (!tokenExists) {
            tokensForPriceFeeds.push(_token);
            emit TokenAdded(_token);
        }
    }

    function requestTokenPrice(address _token) internal returns (bytes32 requestId) {
        bytes memory parameters = abi.encode(bytes32("1S"), bytes32("tokenAddress"), _token);
        bytes32 memory requestId = airnodeContract.makeAirnodeRequest(tokenPriceFeedEndpoinId, sponsorWallet, sponsor, args.parameters);
        tokenPriceRequestIds[_token] = requestId;
        waitingForPriceUpdates += 1;
        emit TokenPriceRequested(_token, requestId);
        return requestId;
    }

    function requestTokenPrices() external returns(bytes32[]) {
        bytes32[] memory requestIds = [];
        for(uint32 i = 0; i < tokensForPriceFeeds.length; i++){
            bytes32 id = requestTokenPrice(tokensForPriceFeeds[i]);
            requestIds.push(id);
        }
        return requestIds;
    }

    function requestMarketStatus(address _token) internal returns(bytes32) {
        bytes memory parameters = abi.encode(bytes32("1S"), bytes32("tokenAddress"), _token);
        bytes32 memory requestId = airnodeContract.makeAirnodeRequest(marketStatusEndpointId, sponsorWallet, sponsor, args.parameters);
        marketStatusRequestIds[_token] = requestId;
        waitingForStatusUpdates += 1;
        emit MarketStatusRequested(_token, requestId);
        return requestId;
    }

    function requestMarketStatuses() external returns(bytes32[]) {
        bytes32[] memory requestIds = [];
        for(uint32 i = 0; i < tokensAddressForMarketStatus.length; i++){
            bytes32 id = requestMarketStatus(tokensAddressForMarketStatus[i]);
            requestIds.push(id);
        }
        return requestIds;
    }

    function getPrice(address _token) internal returns (uint256) {
        bytes32 memory requestId = tokenPriceRequestIds[_token];
        if(airnodeContract.requestResults[requestId] != 0){
            uint256 price = requestResultAsPriceFeed(airnodeContract.requestResults[requestId]).price;
            priceFeeds[_token] = price;
            airnodeContract.clearRequestResult(requestId);
            waitingForPriceUpdates -= 1;
            emit TokenPriceUpdated(_token, price);
            return price;
        }
        else {
            require(priceFeeds[_token]!= 0, "Price not available");
            return priceFeeds[_token];
        }
    }

    requestResultAsPriceFeed(bytes result) internal view returns (PriceFeed) {
        require(result.length != 0, "No result found");
        return abi.decode(result, (PriceFeed));
    }

    function setAllPrices() external returns(bool){
        for(uint8 i = 0; i < tokensForPriceFeeds.length; i++){
            getPrice(tokensForPriceFeeds[i]);
        }
        waitingForStatusUpdates= 0;

        return true;
    }

    function getMarketStatus(address _token) internal returns (uint256) {
        bytes32 memory requestId = tokenPriceRequestIds[_token];
        if(airnodeContract.requestResults[requestId] != 0){
            MarketStatus status = requestResultAstMarketStatus(airnodeContract.requestResults[requestId]);
            marketStatuses[_token] = status;
            airnodeContract.clearRequestResult(requestId);
            emit TokenPriceUpdated(_token, price);
            return price;
        }
        else {
            require(marketStatuses[_token]!= 0, "Status not available");
            return marketStatuses[_token];
        }
    }

    requestResultAstMarketStatus(bytes result) internal view returns (MarketStatus) {
        require(result.length != 0, "No result found");
        return abi.decode(result, (MarketStatus));
    }

    function setAllMarketStatus() external returns(bool) {
        for(uint8 i = 0; i < tokensAddressForMarketStatus.length; i++){
            getMarketStatus(tokensAddressForMarketStatus[i]);
        }

        waitingForStatusUpdates= 0;

        return true;
    }
}