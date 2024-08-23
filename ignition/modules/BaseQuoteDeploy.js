const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

module.exports = buildModule("BaseQuoteModule", (m) => {
    const baseToken = m.contract("MockERC20", ["Base Token", "BASE", ethers.parseEther("1000000"), "0x72F8FAFCcBbE856A26D45758c0D4280cDE26411E"], {id: "MockERC20Base"});
    const quoteToken = m.contract("MockERC20", ["Quote Token", "QUOTE", ethers.parseEther("1000000"), "0x72F8FAFCcBbE856A26D45758c0D4280cDE26411E"], {id: "MockERC20Quote"});
    return { baseToken, quoteToken };
  });