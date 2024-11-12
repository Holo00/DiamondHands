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

        DiamondSwapHelper = await ethers.getContractFactory("SwapHelper");
        diamondSwapHelper = await DiamondSwapHelper.deploy();
        await diamondSwapHelper.deploymentTransaction().wait();
        diamondSwapHelperAddress = await diamondSwapHelper.getAddress();
        console.log('Swap Helper Address', diamondSwapHelperAddress);
        diamondSwapHelper.setRouterForBuyBacks(swapRouterAddress2, wethAddress, 3000);

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
        diamond.setSwapHelperC(diamondSwapHelperAddress);

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

        diamond.setETHMinBalance(ethers.parseEther("0.1"));


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


    it("Mint ", async function () {
        const amountBase = ethers.parseUnits("0.1", 18); // 10 token0
        const amountQuote = ethers.parseUnits("0.001", 18); // 10 token1

        console.log("positionManagerAddress", positionManagerAddress);
        positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);

        //Add liquidity
        await diamond.approve(positionManagerAddress, amountBase);
        await wethContract.approve(positionManagerAddress, amountQuote);

        const params = {
            token0: diamondAddress,
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
        };
        
        console.log("Mint parameters:", params);

        const tx = await positionManagerContract.mint(params, { gasLimit: BigInt(30000000) }); // Adding extra gas to be safe
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


        // Find and log all DiamondTransfer events
        const iface3 = new ethers.Interface([
            "event DiamondTransfer(uint8 indexed transferType, address sender, address indexed from, address indexed to, uint256 value, bytes4 callerSig)"
        ]);
        const diamondTransferTopic = ethers.id("DiamondTransfer(uint8,address,address,address,uint256,bytes4)");

        const diamondTransferEvents = receipt.logs.filter(log => log.topics[0] === diamondTransferTopic);
        if (diamondTransferEvents.length > 0) {
            for (let i = 0; i < diamondTransferEvents.length; i++) {
                try {
                    const decodedEvent = iface3.decodeEventLog("DiamondTransfer", diamondTransferEvents[i].data, diamondTransferEvents[i].topics);
                    const transferType = decodedEvent.transferType;
                    const sender = decodedEvent.sender;
                    const from = decodedEvent.from;
                    const to = decodedEvent.to;
                    const value = decodedEvent.value;
                    const callerSig = decodedEvent.callerSig;

                    console.log(`DiamondTransfer event ${i + 1}:
                        transferType: (${transferType})
                        sender: ${sender}
                        from: ${from}
                        to: ${to}
                        value: ${value}
                        callerSig: ${callerSig}`);
                } catch (error) {
                    console.error(`Error decoding DiamondTransfer event ${i + 1}:`, error);
                }
            }
        } else {
            console.log("No DiamondTransfer events found");
        }

        // Find and log all DiamondTransferFrom events
        const iface5 = new ethers.Interface([
            "event DiamondTransferFrom(uint8 indexed transferType, address sender, address indexed from, address indexed to, uint256 value, bytes4 callerSig)"
        ]);
        const diamondTransferFromTopic = ethers.id("DiamondTransferFrom(uint8,address,address,address,uint256,bytes4)");

        const diamondTransferFromEvents = receipt.logs.filter(log => log.topics[0] === diamondTransferFromTopic);
        if (diamondTransferFromEvents.length > 0) {
            for (let i = 0; i < diamondTransferFromEvents.length; i++) {
                try {
                    const decodedEvent = iface5.decodeEventLog("DiamondTransferFrom", diamondTransferFromEvents[i].data, diamondTransferFromEvents[i].topics);
                    const transferType = decodedEvent.transferType;
                    const sender = decodedEvent.sender;
                    const from = decodedEvent.from;
                    const to = decodedEvent.to;
                    const value = decodedEvent.value;
                    const callerSig = decodedEvent.callerSig;

                    console.log(`DiamondTransferFrom event ${i + 1}:
                        transferType: (${transferType})
                        sender: ${sender}
                        from: ${from}
                        to: ${to}
                        value: ${value}
                        callerSig: ${callerSig}`);
                } catch (error) {
                    console.error(`Error decoding DiamondTransferFrom event ${i + 1}:`, error);
                }
            }
        } else {
            console.log("No DiamondTransferFrom events found");
        }
    });


    it("Buy for ETH", async function () {
        const diamondBalBefore = await diamond.balanceOf(diamondAddress);
        console.log("Diamond Before", diamondBalBefore);
        const diamondETHBal = await ethers.provider.getBalance(diamondAddress);
        console.log("Diamond ETH Before", diamondETHBal);
        
        const tx = await diamond.buyETHForMinimumBalanceRequired();

        const diamondBalAfter = await diamond.balanceOf(diamondAddress);
        console.log("Diamond After", diamondBalAfter);
        const diamondETHBal2 = await ethers.provider.getBalance(diamondAddress);
        console.log("Diamond ETH After", diamondETHBal2);
    });

});