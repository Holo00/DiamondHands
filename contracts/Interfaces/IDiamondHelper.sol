// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../Structs/Status.sol";
import "../Structs/LiquidityPoolToMCAP.sol";

interface IDiamondHelper {
    function getLiquidityPIncentives(uint256 pumpingIncentivesSupply, LiquidityPoolToMCAP calldata poolRatio) external returns(uint256);
    function applyWhaleHandicap(uint256 _holderBalance, uint256 _totalSupply) external view returns(uint256);
    function getContractAgeAirdropDivider(uint256 _creationTime) external view returns(uint256);
    function getBuyerFee(uint256 _amount, Status calldata _status) external view returns(uint256);
    function getSellerFee(uint256 _amount, Status calldata _status) external view returns(uint256);
    function getDipPoints(Status calldata _status) external view returns(uint256);
    function getAirDropSize(uint256 _accountSize, Status calldata _status) external view returns(uint256);
}