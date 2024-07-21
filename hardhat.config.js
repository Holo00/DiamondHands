require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 84532, // default chain ID for Hardhat Network
      // You can add other configurations here if needed
    },
    // Mainnet configuration
    "base-mainnet": {
      url: process.env.MAINNET_RPC_URL || 'https://mainnet.base.org',
      accounts: process.env.MAINNET_RPC_PRIVATE_KEY ? [process.env.MAINNET_RPC_PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
    // Sepolia testnet configuration
    "base-sepolia": {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.SEPOLIA_RPC_PRIVATE_KEY ? [process.env.SEPOLIA_RPC_PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
    // Sepolia testnet configuration
    "base-mainnet-alchemy": {
      url: process.env.ALCHEMY_SEPOLIA_RPC_URL,
      accounts: process.env.ALCHEMY_RPC_PRIVATE_KEY ? [process.env.ALCHEMY_RPC_PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
    // Sepolia testnet configuration
    "base-sepolia-alchemy": {
      url: process.env.ALCHEMY_SEPOLIA_RPC_URL,
      accounts: process.env.ALCHEMY_RPC_PRIVATE_KEY ? [process.env.ALCHEMY_RPC_PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
    // Local development environment configuration
    "base-local": {
      url: "http://localhost:8545",
      accounts: process.env.SEPOLIA_RPC_PRIVATE_KEY ? [process.env.SEPOLIA_RPC_PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
  },
  defaultNetwork: "hardhat",
};
