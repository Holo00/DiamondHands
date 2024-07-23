// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


interface IAirnodeRequester {
    function makeAirnodeRequest(bytes32 _endpointId,
        address _sponsor,
        address _sponsorWallet,
        bytes calldata _parameters) external returns (bytes32 requestId);
    function pendingRequests(bytes32 requestId) external view returns (bool);
    function requestResults(bytes32 requestId) external view returns (uint256);
}

contract AirnodeRequester is RrpRequesterV0, Ownable {
    mapping(bytes32 => bool) public pendingRequests;
    mapping(bytes32 => bytes) public requestResults;

    event RequestMade(bytes32 indexed requestId);
    event RequestFulfilled(bytes32 indexed requestId, bytes result);

    address airnode;

    constructor(address _airnodeRrpAddress, address _airnode, address owner) RrpRequesterV0(_airnodeRrpAddress) Ownable(owner) {
        airnode = _airnode;
    }

    function makeAirnodeRequest(
        bytes32 _endpointId,
        address _sponsor,
        address _sponsorWallet,
        bytes memory _parameters
    ) public onlyOwner returns (bytes32 requestId) {
        requestId = airnodeRrp.makeFullRequest(
            airnode,
            _endpointId,
            _sponsor,
            _sponsorWallet,
            address(this),
            this.fulfill.selector,
            _parameters
        );

        pendingRequests[requestId] = true;
        emit RequestMade(requestId);
        return requestId;
    }

    function makeAirnodeRequestByTokenAddress(
        bytes32 _endpointId,
        address _sponsor,
        address _sponsorWallet,
        address _token
    ) external onlyOwner returns (bytes32 requestId) {
        bytes memory params = abi.encode(
            bytes32("1S"),
            bytes32("tokenAddress"),
            _token
        );

        return makeAirnodeRequest(_endpointId, _sponsor, _sponsorWallet, params);
    }

    function clearRequestResult(bytes32 requestId) external onlyOwner {
        require(requestResults[requestId].length != 0, "No result found");
        delete requestResults[requestId];
    }

    function fulfill(bytes32 requestId, bytes calldata data) external onlyAirnodeRrp {
        require(pendingRequests[requestId], "Request ID is not valid");

        delete pendingRequests[requestId];
        requestResults[requestId] = data;

        emit RequestFulfilled(requestId, data);
    }
}