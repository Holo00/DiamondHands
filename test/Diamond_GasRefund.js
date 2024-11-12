const { expect } = require("chai");
const { ethers } = require("hardhat");
const { abi: NonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json');
const { abi: ISwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { abi: PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const { abi: QuoterV2ABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json');
const { abi: IERC20ABI } = require('@openzeppelin/contracts/build/contracts/IERC20.json');
const { abi: UniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');


// Function to sync past events
async function syncPastHolders(contract, currentBlock) {
    // Set the starting block number (e.g., from contract deployment)
    const fromBlock = getBlock24HoursAgo(currentBlock); // replace with actual block number
    const toBlock = "latest";

    // Query past events
    return await contract.queryFilter("HolderAdded", fromBlock, toBlock);
}

async function getBlock24HoursAgo(currentBlock, provider) {
    // Calculate the target timestamp (24 hours ago)
    const secondsInADay = 24 * 60 * 60;
    const targetTimestamp = currentBlock.timestamp - secondsInADay;

    let low = 0; // start block
    let high = currentBlock.number; // latest block

    // Binary search for the block closest to the target timestamp
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const block = await provider.getBlock(mid);

        if (block.timestamp < targetTimestamp) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    // After the loop, `low` should be the closest block number with a timestamp >= targetTimestamp
    return low;
}



describe("Diamond Transfers", function () {
    let provider;
    let owner, addr1;
    let baseToken, quoteToken;
    let baseAddress, quoteAddress;
    let poolAddress, poolTick;
    let MarketStatus, marketStatus, marketStatusAddress;
    let DiamondHelper, diamondHelper, diamondHelperAddress;
    let DiamondTransferTypeContract, diamondTransferTypeContract, diamondTransferTypeContractAddress;
    let Diamond, diamond, diamondAddress;
    let wethContract;
    let uniSwapFactoryContract, swapRouterAddress2, swapRouterContract;
    let tokenId, liquidity, amount0, amount1;

    let token3Contract, token3Address;
    let token4Contract, token4Address;
    let token5Contract, token5Address;
    let token6Contract, token6Address;
    let token7Contract, token7Address;
    let token8Contract, token8Address;
    let token9Contract, token9Address;

    const uniswapV3FactoryAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
    const swapRouterAddress =  "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Uniswap V3 SwapRouter
    const positionManagerAddress =  "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2"; // Uniswap V3 NonfungiblePositionManager;
    const wethAddress = "0x4200000000000000000000000000000000000006";
    // const uniswapV3FactoryAddress = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
    // const swapRouterAddress =  "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap V3 SwapRouter
    // const positionManagerAddress =  "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1"; // Uniswap V3 NonfungiblePositionManager;
    // const wethAddress = "0x4200000000000000000000000000000000000006";

    // WETH contract ABI
    const wethAbi = [
        'function deposit() public payable',
        'function withdraw(uint wad) public',
        'function balanceOf(address account) public view returns (uint256)',
        'function approve(address spender, uint256 amount) public returns (bool)',
    ];


    before(async function () {
        [owner, addr1] = await ethers.getSigners();

        //Deploy Diamond contract
        Diamond = await ethers.getContractFactory("Diamond");
        diamond = await Diamond.deploy(wethAddress);
        await diamond.deploymentTransaction().wait();
        diamondAddress =  await diamond.getAddress();
        console.log("Diamond add", diamondAddress);
        console.log("Owner add", owner.address);
        const balDiamond = await diamond.balanceOf(owner.address);
        console.log("Diamond Owner Balance: ", balDiamond);
        
        const SwapRouter = await ethers.getContractFactory("SwapRouter");
        swapRouterContract = await SwapRouter.deploy(uniswapV3FactoryAddress, wethAddress);
        await swapRouterContract.deploymentTransaction().wait();
        swapRouterAddress2 = await swapRouterContract.getAddress();
        console.log("swapRouterAddress2", swapRouterAddress2);

        wethContract = new ethers.Contract(wethAddress, wethAbi, owner);
        const amount = ethers.parseEther('10');
        const tx = await wethContract.deposit({ value: amount });
        await tx.wait();
        const ownerWETHBalance = await wethContract.balanceOf(owner.address);
        console.log('ETH wrapped into WETH', ownerWETHBalance);

        //Deploy market status contract
        MarketStatus = await ethers.getContractFactory("MarketStatus");
        marketStatus = await MarketStatus.deploy();
        await marketStatus.deploymentTransaction().wait();
        marketStatusAddress = await marketStatus.getAddress();
        console.log('Market Status Address', marketStatusAddress);

        DiamondHelper = await ethers.getContractFactory("DiamondHelper");
        diamondHelper = await DiamondHelper.deploy();
        await diamondHelper.deploymentTransaction().wait();
        diamondHelperAddress = await diamondHelper.getAddress();
        console.log('Diamond Helper Address', diamondHelperAddress);

        //Deploy market status contract
        DiamondTransferTypeContract = await ethers.getContractFactory("DiamondTransferType");
        diamondTransferTypeContract = await DiamondTransferTypeContract.deploy();
        await diamondTransferTypeContract.deploymentTransaction().wait();
        diamondTransferTypeContractAddress = await diamondTransferTypeContract.getAddress();
        console.log('Transfer Type Address', diamondTransferTypeContractAddress);

        DiamondHoldersContract = await ethers.getContractFactory("DiamondHolders");
        diamondHoldersContract = await DiamondHoldersContract.deploy();
        await diamondHoldersContract.deploymentTransaction().wait();
        diamondHoldersContractAddress = await diamondHoldersContract.getAddress();
        console.log('Diamond Holders Address', diamondHoldersContractAddress);

        diamondTransferTypeContract.addSupportedPositionManagerAddresses(positionManagerAddress, 0);
        diamondTransferTypeContract.addSupportedSwapRouterAddresses(swapRouterAddress2, 0);

        diamondHoldersContract.setDiamondHelperContract(diamondHelperAddress);
        diamondHoldersContract.setDiamondTokenAddress(diamondAddress);

        diamondHelper.setMarketStatusC(marketStatusAddress);

        diamond.setMarketStatusC(marketStatusAddress);
        diamond.setDiamondHelperC(diamondHelperAddress);
        diamond.setTransferHelperC(diamondTransferTypeContractAddress);
        diamond.setDiamondHolderC(diamondHoldersContractAddress);

        const status = {
            status: 1,
            price: ethers.parseEther("1.0"),
            drawDown1: 5,
            drawDown7: 10,
            drawDown30: 15,
            timeStamp: Math.floor(Date.now() / 1000)
        };

        await marketStatus.setMarketStatus(
            diamondAddress,
            status.status,
            status.price,
            status.drawDown1,
            status.drawDown7,
            status.drawDown30,
            status.timeStamp
        );
    });

    it("Refund Gas", async function () {
        const sendEthTx = await owner.sendTransaction({
            to: diamondAddress,
            value: ethers.parseEther("1.0") // Sending 1 ETH to the contract
        });
        await sendEthTx.wait();

        const initialBalance = await ethers.provider.getBalance(owner.address);
        const diamondETHBal = await ethers.provider.getBalance(diamondAddress);
        console.log("Diamond ETH", diamondETHBal);

        const gasDiffTX = await diamond.TestGasRefund();
        const receipt = await gasDiffTX.wait();
        const gasUsed = receipt.gasUsed;
        console.log("Gas Used", gasUsed);

        const diamondETHBal2 = await ethers.provider.getBalance(diamondAddress);
        console.log("Diamond ETH2", diamondETHBal2);

        console.log("Gas refunded", diamondETHBal - diamondETHBal2);

        const finalBalance = await ethers.provider.getBalance(owner.address);

        console.log("Gas difference", finalBalance - initialBalance);
        console.log("Gas initialBalance", initialBalance);
        console.log("Gas finalBalance", finalBalance);
        console.log("Gas difference", gasDiffTX);
    });

});
