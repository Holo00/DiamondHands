// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../Structs/Status.sol";
import "../Structs/DiamondStructs.sol";
import "./IDiamondHelper.sol";


interface IDiamondHolders {
    // Event declarations
    event HolderAdded(uint256 indexed hIndex, address indexed add);
    event TransactionAdd(uint256 indexed hIndex, uint256 qty, uint256 dipP);
    event TransactionRemove(uint256 indexed hIndex, uint256 qty, bool remove);

    // External function declarations
    function setDiamondHelperContract(address _Contract) external;
    function findOrAddHolder(address _address) external returns (uint256);
    function addHolderTx(uint256 _index, uint256 _amount, Status memory _status) external;
    function removeHolderTxs(uint256 _index, uint256 _amount, bool removeDipPoints) external;

    // Getter functions for public variables
    function diamondHelperContract() external view returns (IDiamondHelper);
    function getHolderByIndex(uint256 _index) external view returns (HolderInfo memory);
    function holderIndex(address _address) external view returns (uint256);
    function isIndexedHolderIndex(address _address) external view returns (bool);
    function totalPoints() external view returns (uint256);
}