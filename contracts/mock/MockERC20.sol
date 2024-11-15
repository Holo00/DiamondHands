// SPDX-License-Identifier: MIT
//pragma solidity ^0.8.24;
pragma solidity ^0.7.6;

//import "@openzeppelin/contracts502/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply, address _mintTo) ERC20(name, symbol) {
        _mint(_mintTo, initialSupply);
    }
}
