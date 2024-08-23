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
    let baseAddress, quoteAddress, poolAddress;
    let MarketStatus, marketStatus, marketStatusAddress;
    let DiamondHelper, diamondHelper, diamondHelperAddress;
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

    // WETH contract ABI
    const wethAbi = [
        'function deposit() public payable',
        'function withdraw(uint wad) public',
        'function balanceOf(address account) public view returns (uint256)',
        'function approve(address spender, uint256 amount) public returns (bool)',
    ];


    before(async function () {
        [owner, addr1] = await ethers.getSigners();

        // // wethContract = new ethers.Contract(wethAddress, wethAbi, owner);
        // // const amount = ethers.parseEther('10');
        // // const tx = await wethContract.deposit({ value: amount });
        // // await tx.wait();
        // // const ownerWETHBalance = await wethContract.balanceOf(owner.address);
        // // console.log('ETH wrapped into WETH', ownerWETHBalance);

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
        diamond.setDiamondHelperContract(diamondHelperAddress);
        diamond.addSupportedPositionManagerAddresses(positionManagerAddress);
        console.log("Diamond add", diamondAddress);
        console.log("Owner add", owner.address);

        //const transaction = await owner.sendTransaction({to: diamondAddress, value: ethers.parseEther("0.1") });
        //await transaction.wait();

        await marketStatus.setMarketStatus(
            diamondAddress,
            0,
            1234567,
            0,
            0,
            0,
            Math.floor(Date.now() / 1000) 
        );

        const SwapRouter = await ethers.getContractFactory("SwapRouter");
        swapRouterContract = await SwapRouter.deploy(uniswapV3FactoryAddress, wethAddress);
        await swapRouterContract.deploymentTransaction().wait();
        swapRouterAddress2 = await swapRouterContract.getAddress();

        console.log("Deploying contracts with the account:", owner.address);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        baseToken = await MockERC20.deploy("Base Token", "BASE", ethers.parseEther("1000000"), owner);
        await baseToken.deploymentTransaction().wait();
        baseAddress = await baseToken.getAddress();
        console.log("Base Token deployed to:", baseAddress);

        // quoteToken = await MockERC20.deploy("Quote Token", "QUOTE", ethers.parseEther("1000000"), owner);
        // await quoteToken.deploymentTransaction().wait();
        // quoteAddress =  await quoteToken.getAddress();
        // console.log("Quote Token deployed to:", quoteAddress);

        // token3Contract = await MockERC20.deploy("Token 3", "T3", ethers.parseEther("1000000"), owner);
        // await token3Contract.deploymentTransaction().wait();
        // token3Address = await token3Contract.getAddress();

        // token4Contract = await MockERC20.deploy("Token 4", "T4", ethers.parseEther("1000000"), owner);
        // await token4Contract.deploymentTransaction().wait();
        // token4Address = await token4Contract.getAddress();

        // token5Contract = await MockERC20.deploy("Token 5", "T5", ethers.parseEther("1000000"), owner);
        // await token5Contract.deploymentTransaction().wait();
        // token5Address = await token5Contract.getAddress();

        // token6Contract = await MockERC20.deploy("Token 6", "T6", ethers.parseEther("1000000"), owner);
        // await token6Contract.deploymentTransaction().wait();
        // token6Address = await token6Contract.getAddress();

        // token7Contract = await MockERC20.deploy("Token 7", "T7", ethers.parseEther("1000000"), owner);
        // await token7Contract.deploymentTransaction().wait();
        // token7Address = await token7Contract.getAddress();


        wethContract = new ethers.Contract(wethAddress, wethAbi, owner);
        const amount = ethers.parseEther('10');
        const tx = await wethContract.deposit({ value: amount });
        await tx.wait();
        const ownerWETHBalance = await wethContract.balanceOf(owner.address);
        console.log('ETH wrapped into WETH', ownerWETHBalance);

      });

      it("Create Pool ", async function () {
        const UniswapV3Factory = new ethers.Contract(uniswapV3FactoryAddress, UniswapV3FactoryABI, owner);
        
        const tx = await UniswapV3Factory.createPool(baseAddress, wethAddress, 3000);
        const receiptPool = await tx.wait();

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
      });

      it("Mint ", async function () {
        const amountBase = ethers.parseUnits("0.1", 18); // 10 token0
        const amountQuote = ethers.parseUnits("0.001", 18); // 10 token1

        positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);

        //Add liquidity
        await baseToken.approve(positionManagerAddress, amountBase);
        await wethContract.approve(positionManagerAddress, amountQuote);

        const tx = await positionManagerContract.mint({
            token0: baseAddress,
            token1: wethAddress,
            fee: 3000,
            tickLower: -60000,
            tickUpper: 60000,
            amount0Desired: amountBase,
            amount1Desired: amountQuote,
            amount0Min: 0,
            amount1Min: 0,
            recipient: owner.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20
        }, { gasLimit: BigInt(1000000) }); // Adding extra gas to be safe

        const receipt = await tx.wait();

        // Find the IncreaseLiquidity event in the logs
        const iface2 = new ethers.Interface(NonfungiblePositionManagerABI);
        const eventTopic = ethers.id("IncreaseLiquidity(uint256,uint128,uint256,uint256)");
        console.log("iface2", eventTopic);
        const liquidityAddedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("IncreaseLiquidity(uint256,uint128,uint256,uint256)"));
        if (liquidityAddedEvent) {
            const decodedEvent = iface2.decodeEventLog("IncreaseLiquidity", liquidityAddedEvent.data, liquidityAddedEvent.topics);
            tokenId = decodedEvent.tokenId;
            liquidity = decodedEvent.liquidity;
            amount0 = decodedEvent.amount0;
            amount1 = decodedEvent.amount1;
            //const { tokenId, liquidity, amount0, amount1 } = decodedEvent;

            console.log(`LiquidityAdded event:
                tokenId: ${tokenId.toString()}
                liquidity: ${liquidity.toString()}
                amount0: ${amount0.toString()}
                amount1: ${amount1.toString()}`);
        } else {
            console.log("IncreaseLiquidity event not found");
        }
        
        // Find and log all Transfer events
        const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
        const transferTopic = ethers.id("Transfer(address,address,uint256)");

        const transferEvents = receipt.logs.filter(log => log.topics[0] === transferTopic);
        if (transferEvents.length > 0) {
            for(let i = 0; i < transferEvents.length; i++){
                try {
                    const decodedEvent = iface.decodeEventLog("Transfer", transferEvents[i].data, transferEvents[i].topics);
                    const from = decodedEvent.from;
                    const to = decodedEvent.to;
                    const value = decodedEvent.value;

                    console.log(`Transfer event ${i + 1}:
                        from: ${from}
                        to: ${to}
                        value: ${value}`);
                } catch (error) {
                    //console.error(`Error decoding Transfer event ${i + 1}:`, error);
                }
            }
        } else {
            console.log("No Transfer events found");
        }
      });

    //   it("Too Many ", async function () {
    //     await baseToken.transfer(addr1.address, ethers.parseEther("100"));
    //     await quoteToken.transfer(addr1.address, ethers.parseEther("100"));
    //     await token3Contract.transfer(addr1.address, ethers.parseEther("100"));
    //     await token4Contract.transfer(addr1.address, ethers.parseEther("100"));
    //     await token5Contract.transfer(addr1.address, ethers.parseEther("100"));
    //     await token6Contract.transfer(addr1.address, ethers.parseEther("100"));
    //     await token7Contract.transfer(addr1.address, ethers.parseEther("100"));
    //   });

      it("Swap", async function () {
        //let swapContract = new ethers.Contract(swapRouterAddress, SwapRouterABI, owner);

        //const factory = await swapRouterContract.factory();
        //console.log("factory", factory);

        const amountBase2 = ethers.parseUnits("0.0000001", 18);
        await baseToken.approve(swapRouterAddress2, ethers.parseUnits("0.0000001", 18));

        const params = {
            tokenIn: baseAddress,
            tokenOut: wethAddress,
            fee: 3000,
            recipient: owner.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            amountIn: amountBase2,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        };
        
        console.log("Swap parameters:", params);

        const balanceBeforeSwap = await baseToken.balanceOf(owner.address);
        const balanceBeforeSwapWETH = await wethContract.balanceOf(owner.address);
        console.log("balanceBeforeSwap", balanceBeforeSwap);

        try{
            // Perform the swap
            const tx2 = await swapRouterContract.exactInputSingle(params, { gasLimit: BigInt(30000000) }); 
            //console.log(tx2);
        
            await tx2.wait();
        }
        catch(error){
            console.log(error);
            //console.log(tracer.getLastTrace());
        }

        const balanceAfterSwap = await baseToken.balanceOf(owner.address);
        console.log("balanceAfterSwap", balanceAfterSwap);

        console.log("balanceBeforeSwapWETH", balanceBeforeSwapWETH);
        const balanceAfterSwapWETH = await wethContract.balanceOf(owner.address);
        console.log("balanceAfterSwapWETH", balanceAfterSwapWETH - balanceBeforeSwapWETH);

        expect(balanceAfterSwap).to.be.equal(balanceBeforeSwap - amountBase2);
      });
});