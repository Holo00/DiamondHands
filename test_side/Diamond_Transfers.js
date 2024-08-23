const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Token, Pool, Position, nearestUsableTick } = require('@uniswap/v3-sdk');
const { Token: UniToken } = require('@uniswap/sdk-core');
const { abi: NonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');
const JSBI = require('jsbi');

describe("Diamond_Transfers", function () {
    let DiamondLiquidityProvider, diamondLiquidityProvider, liquidProviderAdd, poolAddress;
    let MarketStatus, marketStatus, marketStatusAddress;
    let DiamondHelper, diamondHelper, diamondHelperAddress;
    let baseToken, baseAddress, quoteToken, quoteAddress;
    let sqrtPriceX96, tick;
    let diamondAddress;
    let positionManagerContract;
    let wethContract;
    let owner, addr1, addr2;
    const uniswapV3FactoryAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
    const swapRouterAddress =  "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Uniswap V3 SwapRouter
    const positionManagerAddress =  "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2"; // Uniswap V3 NonfungiblePositionManager
    const wethAddress = "0x4200000000000000000000000000000000000006";

    // WETH contract ABI
    const wethAbi = [
        'function deposit() public payable',
        'function withdraw(uint wad) public',
        'function balanceOf(address account) public view returns (uint256)',
        'function approve(address spender, uint256 amount) public returns (bool)',
    ];

    before(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        //Deploy market status contract
        MarketStatus = await ethers.getContractFactory("MarketStatus");
        marketStatus = await MarketStatus.deploy();
        await marketStatus.deploymentTransaction().wait();
        marketStatusAddress = await marketStatus.getAddress();

        //Deploy diamond helper contract
        DiamondHelper = await ethers.getContractFactory("DiamondHelper");
        diamondHelper = await DiamondHelper.deploy();
        await diamondHelper.deploymentTransaction().wait();
        diamondHelperAddress = await diamondHelper.getAddress();
    
        //Deploy Diamond contract
        Diamond = await ethers.getContractFactory("Diamond");
        diamond = await Diamond.deploy(marketStatusAddress, wethAddress);
        await diamond.deploymentTransaction().wait();
        diamondAddress =  await diamond.getAddress();
        //diamond.setDiamondHelperContract(diamondHelperAddress);

        const ownerBalance = await diamond.balanceOf(owner.address);
        const contractBalance = await diamond.balanceOf(diamondAddress);

        console.log("owner balance", ownerBalance);
        console.log("contract balance", contractBalance);

        const ownerETHBalance = await ethers.provider.getBalance(owner.address);
        const addr1ETHBalance = await ethers.provider.getBalance(addr1.address);
        const addr2ETHBalance = await ethers.provider.getBalance(addr2.address);

        console.log("owner ETH", ownerETHBalance);
        console.log("addr1 ETH", addr1ETHBalance);
        console.log("addr2 ETH", addr2ETHBalance);

        console.log("Deploying contracts with the account:", owner.address);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        baseToken = await MockERC20.deploy("Base Token", "BASE", ethers.parseEther("1000000"), owner.address);
        await baseToken.deploymentTransaction().wait();
        baseAddress = await baseToken.getAddress();
        quoteToken = await MockERC20.deploy("Quote Token", "QUOTE", ethers.parseEther("1000000"), owner.address);
        await quoteToken.deploymentTransaction().wait();
        quoteAddress =  await quoteToken.getAddress();
       
        // Wrap ETH
        wethContract = new ethers.Contract(wethAddress, wethAbi, owner);
        const amount = ethers.parseEther('10');
        const tx = await wethContract.deposit({ value: amount });
        await tx.wait();
        const ownerWETHBalance = await wethContract.balanceOf(owner.address);
        console.log('ETH wrapped into WETH', ownerWETHBalance);


        DiamondLiquidityProvider = await ethers.getContractFactory("DiamondLiquidityProvider");
        //diamondLiquidityProvider = await DiamondLiquidityProvider.deploy(diamondAddress, uniswapV3FactoryAddress, positionManagerAddress);
        diamondLiquidityProvider = await DiamondLiquidityProvider.deploy(baseAddress, uniswapV3FactoryAddress, positionManagerAddress);
        await diamondLiquidityProvider.deploymentTransaction().wait();
        liquidProviderAdd = await diamondLiquidityProvider.getAddress();
        console.log("DiamondLiquidityProvider deployed to:", liquidProviderAdd);

        //Create the liquidity pool
        const sqrt1 = BigInt(Math.floor(Math.sqrt(1000)));
        const twoPow96 = BigInt(2) ** BigInt(96);
        sqrtPriceX96 = twoPow96 / sqrt1;
        console.log("sqrtPriceX96:", sqrtPriceX96.toString());

        // Use JSBI for calculations involving large integers
        const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
        const sqrtPriceX96JSBI = JSBI.BigInt(sqrtPriceX96.toString());
        
        // Convert JSBI to native number for logarithmic calculations
        const sqrtPriceX96Number = JSBI.toNumber(sqrtPriceX96JSBI);
        const Q96Number = JSBI.toNumber(Q96);

        tick = Math.floor(Math.log((sqrtPriceX96Number / Q96Number) ** 2) / Math.log(1.0001));
        console.log("tick:", tick.toString());

        const txCreatePool = await diamondLiquidityProvider.createPool(
            quoteAddress,//wethAddress,
            3000,
            sqrtPriceX96
        );
        const receipt = await txCreatePool.wait();

        // Find the PoolCreated event in the logs
        const poolCreatedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("PoolCreated(address,address,uint24,address)"));
        if (poolCreatedEvent) {
            const iface = new ethers.Interface(["event PoolCreated(address tokenA, address tokenB, uint24 fee, address pool)"]);
            const decodedEvent = iface.decodeEventLog("PoolCreated", poolCreatedEvent.data, poolCreatedEvent.topics);
            poolAddress = decodedEvent.pool;
            console.log("Pool Address:", poolAddress);
        } else {
            console.log("PoolCreated event not found");
        }

        //await diamond.addSupportedPoolAddress(poolAddress);
        //await diamond.addSupportedPositionManagerAddresses(positionManagerAddress);


        await marketStatus.setMarketStatus(
            diamondAddress,
            1,
            3000,
            0,
            0,
            0,
            Math.floor(Date.now() / 1000)
        );
    });

    it("Adding liquidity should not charge fees", async function () {
        // const amount_1 = ethers.parseUnits('1', 18);
        // const amount_2 = ethers.parseUnits('1', 18);

        // // // //await diamond.approve(liquidProviderAdd, amount_1);
        // // await baseToken.approve(liquidProviderAdd, amount_1);
        // // // //await wethContract.approve(liquidProviderAdd, amount_2);
        // // await quoteToken.approve(liquidProviderAdd, amount_2);

        // // // Adding liquidity by calling the function from whaleSigner
        // // const addLiquidityTx = await diamondLiquidityProvider.addLiquidity(
        // //     quoteAddress,//wethAddress,
        // //     3000, // fee tier
        // //     amount_1,
        // //     amount_2//,
        // //     //{ gasLimit: 5000000 } // Set a higher gas limit
        // // );
    
        // // const receipt = await addLiquidityTx.wait();
        // // //console.log("receipt.logs", receipt.logs);
    
        // // // Find the LiquidityAdded event in the logs
        // // const liquidityAddedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("LiquidityAdded(uint256,uint128,uint256,uint256)"));
        // // if (liquidityAddedEvent) {
        // //     const iface = new ethers.Interface(["event LiquidityAdded(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"]);
        // //     const decodedEvent = iface.decodeEventLog("LiquidityAdded", liquidityAddedEvent.data, liquidityAddedEvent.topics);
        // //     tokenId = decodedEvent.tokenId;
        // //     liquidity = decodedEvent.liquidity;
        // //     amount0 = decodedEvent.amount0;
        // //     amount1 = decodedEvent.amount1;
    
        // //     console.log(`LiquidityAdded event:
        // //         tokenId: ${tokenId}
        // //         liquidity: ${liquidity}
        // //         amount0: ${amount0}
        // //         amount1: ${amount1}`);
        // // } else {
        // //     console.log("LiquidityAdded event not found");
        // // }

        // positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);


        // //Add liquidity
        // await baseToken.approve(positionManagerAddress, amount_1);
        // await quoteToken.approve(positionManagerAddress, amount_2);

        // //console.log("Contract ", positionManagerContract);

        // const tx = await positionManagerContract.mint({
        //     token0: baseAddress,
        //     token1: quoteAddress,
        //     fee: 3000,
        //     tickLower: -60000,
        //     tickUpper: 60000,
        //     amount0Desired: amount_1,
        //     amount1Desired: amount_2,
        //     amount0Min: 0,
        //     amount1Min: 0,
        //     recipient: owner.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60 * 20
        // });
    
        // const result = await tx.wait();
        // console.log('Liquidity added', result);
    });
});