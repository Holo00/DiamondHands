// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// import "./AirnodeBase.sol";

// interface IAirnodePriceFeed {
//     function requestTokenPrices() external returns (bool result);
//     function tokenRequestIds(address _address) external view returns (address tokenRequestId);
//     function priceFeeds(address _address) external view returns (uint256 price);
//     function tokenPriceRequestArgs(address _address) external view returns (AirnodeFeedArgs args);
//     function tokens() external view returns (address[] tokens);
// }

// struct AirnodeFeedArgs{
//     bytes32 endpointId,
//     address sponsorWallet,
//     address airnode,
//     address sponsor,
//     bytes calldata parameters
// }

// abstract contract AirnodePriceFeed is AirnodeBase, OwnableUpgradeable {
//     mapping(address => address) public tokenRequestIds; // token address => Airnode price results
//     mapping(address => uint) public priceFeeds; // price feed results
//     mapping(address => AirnodeFeedArgs) public tokenPriceRequestArgs;
//     address[] public tokens;

//     event TokenAdded(address indexed token);
//     event TokenPriceRequested(address indexed token, bytes32 indexed requestId);
//     event TokenPriceUpdated(address indexed token, uint256 price);

//     function addAirnodeFeedArgs(bytes32 _endpointId, address _sponsorWallet, address _airnode, address _sponsor, bytes calldata _parameters, address _token) 
//         onlyOwner external {
//         AirnodeFeedArgs args = new AirnodeFeedArgs();
//         args.endpointId = _endpointId;
//         args.sponsorWallet = _sponsorWallet;
//         args.airnode = _airnode;
//         args.sponsor = _sponsor;
//         bytes parmas = 
//         args.parameters = _parameters;
//         tokenPriceRequestArgs[_token] = args;
        
//         bool tokenExists = false;
//         for (uint256 i = 0; i < tokens.length; i++) {
//             if (tokens[i] == _token) {
//                 tokenExists = true;
//                 break;
//             }
//         }
//         if (!tokenExists) {
//             tokens.push(_token);
//             emit TokenAdded(_token);
//         }
//     }

//     function requestTokenPrice(address token) internal returns (bytes32 requestId) {
//         AirnodeFeedArgs args = tokenPriceRequestArgs[token];
//         requestId = makeAirnodeRequest(args.endpointId, args.sponsorWallet, args.airnode, args.sponsor, args.parameters);
//         tokenRequestIds[token] = requestId;
//         emit TokenPriceRequested(token, requestId);
//     }

//     function requestTokenPrices() external returns(bool) {
//         for(uint32 i = 0; i < tokens.length; i++){
//             requestTokenPrice(tokens[i]);
//         }
//         return true;
//     }

//     function getPrice(address token) internal returns (uint256) {
//         bytes32 requestId = tokenRequestIds[token];
//         if(requestResults[requestId] != 0){
//             uint256 price = requestResults[requestId];
//             priceFeeds[token] = price;
//             delete requestResults[requestId]; // Clear the reference for requestResults[requestId]
//             emit TokenPriceUpdated(token, price);
//             return price;
//         }
//         else {
//             require(priceFeeds[token]!= 0, "Price not available");
//             return priceFeeds[token];
//         }
//     }
// }