const { expect } = require("chai");
const { ethers } = require("hardhat");
const { abi: NonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json');
const { abi: ISwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { abi: PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const { abi: QuoterV2ABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json');
const { abi: IERC20ABI } = require('@openzeppelin/contracts/build/contracts/IERC20.json');
const { abi: UniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');


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

        diamondTransferTypeContract.addSupportedPositionManagerAddresses(positionManagerAddress, 0);
        diamondTransferTypeContract.addSupportedSwapRouterAddresses(swapRouterAddress2, 0);

        diamond.setMarketStatusContract(marketStatusAddress);
        diamond.setDiamondHelperContract(diamondHelperAddress);
        diamond.setTransferHelperContract(diamondTransferTypeContractAddress);

        const UniswapV3Factory = new ethers.Contract(uniswapV3FactoryAddress, UniswapV3FactoryABI, owner);
        
        const tx2 = await UniswapV3Factory.createPool(diamondAddress, wethAddress, 3000);
        const receiptPool = await tx2.wait();

        // Find the PoolCreated event in the logs
        const poolCreatedEvent = receiptPool.logs.find(log => log.topics[0] === ethers.id("PoolCreated(address,address,uint24,int24,address)"));
        if (poolCreatedEvent) {
            const iface = new ethers.Interface(["event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)"]);
            const decodedEvent = iface.decodeEventLog("PoolCreated", poolCreatedEvent.data, poolCreatedEvent.topics);
            poolAddress = decodedEvent.pool;
            console.log("Pool Address:", poolAddress);
        } 
        else {
            console.log("PoolCreated event not found");
        }

        const poolCOntract = new ethers.Contract(poolAddress, PoolABI, owner);

        const sqrt1 = BigInt(Math.sqrt(100));
        const twoPow96 = BigInt(2) ** BigInt(96);
        const sqrtPriceX96 = twoPow96 / sqrt1;
        console.log("sqrtPriceX96:", sqrtPriceX96.toString());

        const txInit = await poolCOntract.initialize(sqrtPriceX96);
        const receiptInit = await txInit.wait();

        const initializeEvent = receiptInit.logs.find(log => log.topics[0] === ethers.id("Initialize(uint160,int24)"));
        if (initializeEvent) {
            const iface3 = new ethers.Interface(["event Initialize(uint160 sqrtPriceX96, int24 tick)"]);
            const decodedEvent = iface3.decodeEventLog("Initialize", initializeEvent.data, initializeEvent.topics);
            const sqrtPriceX96 = decodedEvent.sqrtPriceX96;
            poolTick = decodedEvent.tick;
            console.log("sqrtPriceX96:", sqrtPriceX96);
            console.log("Tick:", poolTick);
        } else {
            console.log("Initialize event not found");
        }

        diamondTransferTypeContract.addSupportedPoolAddress(poolAddress, 0);
      });

      it("Create Pool ", async function () {
        
      });

      it("Check TX Type Pool ", async function () {
        expect(await diamondTransferTypeContract.uni_supportedPoolAddresses(poolAddress)).to.be.true;
        expect(await diamondTransferTypeContract.uni_supportedPositionManagerAddresses(positionManagerAddress)).to.be.true;
        expect(await diamondTransferTypeContract.uni_supportedSwapRouterAddresses(swapRouterAddress2)).to.be.true;

        const tx = await diamondTransferTypeContract.functionCheckType(positionManagerAddress, owner.address, poolAddress);
        console.log("TX1 Result" ,tx);
        expect(tx).to.be.equal(0);

        const tx3 = await diamondTransferTypeContract.functionCheckType(positionManagerAddress, poolAddress, owner.address);
        console.log("TX2 Result" ,tx3);
        expect(tx3).to.be.equal(1);

        const tx4 = await diamondTransferTypeContract.functionCheckType(swapRouterAddress2, owner.address, poolAddress);
        console.log("TX3 Result" ,tx4);
        expect(tx4).to.be.equal(3);

        const tx5 = await diamondTransferTypeContract.functionCheckType(swapRouterAddress2, poolAddress, owner.address);
        console.log("TX4 Result" ,tx5);
        expect(tx5).to.be.equal(2);
      });
});