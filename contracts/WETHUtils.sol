// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces/IWETH.sol";


contract WETHUtils is Ownable {
    IWETH wethContract;
    uint256 ethMinBalance = 0;

    constructor() Ownable()
    {
        
    }

    function setETHMinBalance(uint256 _min) external onlyOwner{
        ethMinBalance = _min;
    }

    function refundGas(uint256 gasStart) internal {
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasCost = gasUsed * tx.gasprice;
        if (address(this).balance >= gasCost) {
            (bool success, ) = msg.sender.call{value: gasCost}("");
            require(success, "GRF"); // Gas reimbursement failed
        }
    }
    
    function unwrapWETH() internal {
        uint256 wethBalance = wethContract.balanceOf(address(this));
        if (wethBalance > 0) {
            wethContract.withdraw(wethBalance);
        }
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}