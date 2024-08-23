// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../Enums/DiamondEnums.sol";

interface IDiamondTransferType{
    function functionCheckType(address _txSender, address _sender, address _recipient) external view returns (TransferType);
}