const { expect } = require("chai");
const { ethers } = require("hardhat");
const { abi: NonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json');
const { abi: ISwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { abi: PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const { abi: QuoterV2ABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json');
const { abi: IERC20ABI } = require('@openzeppelin/contracts/build/contracts/IERC20.json');
const { abi: UniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');


async function seedPool2(positionManagerAddress, uniswapV3FactoryAddress, baseAddress, baseToken, quoteAddress, quoteToken, owner) {
    let poolAddress;

    const UniswapV3Factory = new ethers.Contract(uniswapV3FactoryAddress, UniswapV3FactoryABI, owner);
    
    const tx = await UniswapV3Factory.createPool(baseAddress, quoteAddress, 3000);
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

    return poolAddress;
}


async function seedPool(positionManagerAddress, uniswapV3FactoryAddress, baseAddress, baseToken, quoteAddress, quoteToken, owner) {
    let poolAddress;

    const DiamondLiquidityProvider = await ethers.getContractFactory("DiamondLiquidityProvider");
    const diamondLiquidityProvider = await DiamondLiquidityProvider.deploy(baseAddress, uniswapV3FactoryAddress, positionManagerAddress);
    await diamondLiquidityProvider.deploymentTransaction().wait();
    const liquidProviderAdd = await diamondLiquidityProvider.getAddress();
    console.log("DiamondLiquidityProvider deployed to:", liquidProviderAdd);

    const sqrt1 = BigInt(Math.sqrt(100));
    const twoPow96 = BigInt(2) ** BigInt(96);
    const sqrtPriceX96 = twoPow96 / sqrt1;
    console.log("sqrtPriceX96:", sqrtPriceX96.toString());

    const txCreatePool = await diamondLiquidityProvider.createPool(
        quoteAddress,
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
    } 
    else {
        console.log("PoolCreated event not found");
    }

    return poolAddress;
}



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
    // const uniswapV3FactoryAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
    // const swapRouterAddress =  "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Uniswap V3 SwapRouter
    // const positionManagerAddress =  "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2"; // Uniswap V3 NonfungiblePositionManager;
    // const wethAddress = "0x4200000000000000000000000000000000000006";

    //mainet
    const uniswapV3FactoryAddress = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
    const swapRouterAddress =  "0x2626664c2603336E57B271c5C0b26F421741e481"; 
    const positionManagerAddress =  "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
    const quoterAddress = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
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

        //wethContract = new ethers.Contract(wethAddress, wethAbi, owner);

        // const SwapRouter = await ethers.getContractFactory("SwapRouter");
        // swapRouterContract = await SwapRouter.deploy("0x33128a8fC17869897dcE68Ed026d694621f6FDfD", wethAddress);
        // await swapRouterContract.deploymentTransaction().wait();
        // swapRouterAddress2 = await swapRouterContract.getAddress();

        // console.log("Deploying contracts with the account:", owner.address);
        // const MockERC20 = await ethers.getContractFactory("MockERC20");
        // baseToken = await MockERC20.deploy("Base Token", "BASE", ethers.parseEther("1000000"), owner);
        // await baseToken.deploymentTransaction().wait();
        // baseAddress = await baseToken.getAddress();
        // console.log("Base Token deployed to:", baseAddress);
        // quoteToken = await MockERC20.deploy("Quote Token", "QUOTE", ethers.parseEther("1000000"), owner);
        // await quoteToken.deploymentTransaction().wait();
        // quoteAddress =  await quoteToken.getAddress();
        // console.log("Quote Token deployed to:", quoteAddress);

        //baseAddress = "0x13b582010Aa69719A9661Ecaa6d92c391E6D8b10";
        //quoteAddress = "0xA5daA81d05b6679E286ca0Da49715A6Ad3B8A1E3";
        baseAddress = "0x940181a94a35a4569e4529a3cdfb74e38fd98631";
        quoteAddress = "0x532f27101965dd16442e59d40670faf5ebb142e4";
        baseToken = new ethers.Contract(baseAddress, IERC20ABI, owner);
        quoteToken = new ethers.Contract(quoteAddress, IERC20ABI, owner);

        console.log("baseBalance", baseToken);
        console.log("quoteBalance", quoteToken);

        const getBlockNumber = await ethers.provider.getBlockNumber(); // Verify the current block number
        const getNetwork = await ethers.provider.getNetwork(); // Check the network details

        console.log("getBlockNumber", getBlockNumber);
        console.log("getNetwork", getNetwork);

        const baseBalance = await baseToken.balanceOf(owner.address);
        const quoteBalance = await quoteToken.balanceOf(owner.address);

        console.log("baseBalance", baseBalance);
        console.log("quoteBalance", quoteBalance);

        //poolAddress = await seedPool(positionManagerAddress, uniswapV3FactoryAddress, baseAddress, baseToken, quoteAddress, quoteToken, owner);
        poolAddress = await seedPool2(positionManagerAddress, uniswapV3FactoryAddress, baseAddress, baseToken, quoteAddress, quoteToken, owner);
      });

      it("Adding liquidity ", async function () {
        // const amountBase = ethers.parseUnits("0.1", 18); // 10 token0
        // const amountQuote = ethers.parseUnits("0.001", 18); // 10 token1

        // positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);

        // //Add liquidity
        // await baseToken.approve(positionManagerAddress, amountBase);
        // await quoteToken.approve(positionManagerAddress, amountQuote);

        // const tx = await positionManagerContract.mint({
        //     token0: baseAddress,
        //     token1: quoteAddress,
        //     fee: 3000,
        //     tickLower: -60000,
        //     tickUpper: 60000,
        //     amount0Desired: amountBase,
        //     amount1Desired: amountQuote,
        //     amount0Min: 0,
        //     amount1Min: 0,
        //     recipient: owner.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60 * 20
        // }, { gasLimit: BigInt(1000000) }); // Adding extra gas to be safe

        // const receipt = await tx.wait();

        // // Find the IncreaseLiquidity event in the logs
        // const iface2 = new ethers.Interface(NonfungiblePositionManagerABI);
        // const eventTopic = ethers.id("IncreaseLiquidity(uint256,uint128,uint256,uint256)");
        // console.log("iface2", eventTopic);
        // const liquidityAddedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("IncreaseLiquidity(uint256,uint128,uint256,uint256)"));
        // if (liquidityAddedEvent) {
        //     const decodedEvent = iface2.decodeEventLog("IncreaseLiquidity", liquidityAddedEvent.data, liquidityAddedEvent.topics);
        //     tokenId = decodedEvent.tokenId;
        //     liquidity = decodedEvent.liquidity;
        //     amount0 = decodedEvent.amount0;
        //     amount1 = decodedEvent.amount1;
        //     //const { tokenId, liquidity, amount0, amount1 } = decodedEvent;

        //     console.log(`LiquidityAdded event:
        //         tokenId: ${tokenId.toString()}
        //         liquidity: ${liquidity.toString()}
        //         amount0: ${amount0.toString()}
        //         amount1: ${amount1.toString()}`);
        // } else {
        //     console.log("IncreaseLiquidity event not found");
        // }
        
        // // Find and log all Transfer events
        // const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
        // const transferTopic = ethers.id("Transfer(address,address,uint256)");

        // const transferEvents = receipt.logs.filter(log => log.topics[0] === transferTopic);
        // if (transferEvents.length > 0) {
        //     for(let i = 0; i < transferEvents.length; i++){
        //         try {
        //             const decodedEvent = iface.decodeEventLog("Transfer", transferEvents[i].data, transferEvents[i].topics);
        //             const from = decodedEvent.from;
        //             const to = decodedEvent.to;
        //             const value = decodedEvent.value;

        //             console.log(`Transfer event ${i + 1}:
        //                 from: ${from}
        //                 to: ${to}
        //                 value: ${value}`);
        //         } catch (error) {
        //             //console.error(`Error decoding Transfer event ${i + 1}:`, error);
        //         }
        //     }
        // } else {
        //     console.log("No Transfer events found");
        // }
      });



      it("Swap for sell ", async function () {
        const amountBase = ethers.parseUnits("0.1", 18); // 10 token0
        const amountQuote = ethers.parseUnits("0.001", 18); // 10 token1

        positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);

        //Add liquidity
        await baseToken.approve(positionManagerAddress, amountBase);
        await quoteToken.approve(positionManagerAddress, amountQuote);

        const tx = await positionManagerContract.mint({
            token0: baseAddress,
            token1: quoteAddress,
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









        // let uniswapV3Pool = new ethers.Contract(poolAddress, PoolABI, owner);
        // const amountBase2 = ethers.parseUnits("0.0000001", 18);

        // await baseToken.approve(poolAddress, amountBase2);

        // const abiCoder = ethers.AbiCoder.defaultAbiCoder();

        // // Define the path for the swap (token addresses and fees)
        // const path = ethers.solidityPacked(
        //     ["address", "uint24", "address"],
        //     [baseAddress, 3000, quoteAddress]
        // );

        // console.log(path);

        // const swapParams = {
        //     amount0Delta: amountBase2, // Amount of token0 to swap
        //     amount1Delta: 0, // Minimum amount of token1 to receive
        //     data: abiCoder.encode(
        //         ["bytes", "address"],
        //         [path, owner.address]
        //       )
        //     //data: abiCoder.encode(["address"], [owner.address]) // Encode recipient address
        //   };
    
        // const tx2 = await uniswapV3Pool.swap(
        //     owner.address,
        //     true, // `true` for token0 -> token1 swap, `false` for token1 -> token0 swap
        //     amountBase2,
        //     0,
        //     swapParams
        // );

        // await tx2.wait();




        // let swapContract = new ethers.Contract(swapRouterAddress, SwapRouterABI, owner);
        // const amountBase2 = ethers.parseUnits("0.0000001", 18);


        // await baseToken.approve(swapRouterAddress, ethers.parseUnits("0.000001", 18));

        // const params = {
        //     tokenIn: baseAddress,
        //     tokenOut: quoteAddress,
        //     fee: 3000,
        //     recipient: owner.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        //     amountIn: amountBase2,
        //     amountOutMinimum: 0,
        //     sqrtPriceLimitX96: 0,
        // };
        
        // console.log("Swap parameters:", params);

        // // Perform the swap
        // const tx2 = await swapContract.exactInputSingle(params, { gasLimit: BigInt(30000000) }); 
        // console.log(tx2);
    
        // await tx2.wait();



        let swapContract = new ethers.Contract(swapRouterAddress, SwapRouterABI, owner);

        const factory = await swapContract.factory();
        console.log("factory", factory);

        const amountBase2 = ethers.parseUnits("0.0000001", 18);
        await baseToken.approve(swapRouterAddress, ethers.parseUnits("0.000001", 18));

        const params = {
            tokenIn: baseAddress,
            tokenOut: quoteAddress,
            fee: 3000,
            recipient: owner.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            amountIn: amountBase2,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        };
        
        console.log("Swap parameters:", params);

        try{
            // Perform the swap
            const tx2 = await swapContract.exactInputSingle(params, { gasLimit: BigInt(30000000) }); 
            console.log(tx2);
        
            await tx2.wait();
        }
        catch(error){
            console.log(error);
            //console.log(tracer.getLastTrace());
        }



        // const amountBase2 = ethers.parseUnits("0.0000001", 18);
        // await baseToken.approve(swapRouterAddress2, ethers.parseUnits("0.0000001", 18));

        // const params = {
        //     tokenIn: baseAddress,
        //     tokenOut: quoteAddress,
        //     fee: 3000,
        //     recipient: owner.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        //     amountIn: amountBase2,
        //     amountOutMinimum: 0,
        //     sqrtPriceLimitX96: 0,
        // };
        
        // console.log("Swap parameters:", params);
        // console.log(tracer.getLastTrace());

        // try{
        //     // Perform the swap
        //     const tx2 = await swapRouterContract.exactInputSingle2(params, { gasLimit: BigInt(30000000) }); 
        //     console.log(tx2);

        //     await tx2.wait();
        // }
        // catch(error){
        //     console.log(error);
        //     console.log(tracer.getLastTrace());
        // }
      });





    //   it("Removing liquidity ", async function () {
    //     const amountBase = ethers.parseUnits("0.01", 18); // 10 token0
    //     const amountQuote = ethers.parseUnits("0.0001", 18); // 10 token1

    //     //positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);

    //     //console.log("liquidity", liquidity);
    //     //console.log("liquidity10", liquidity / BigInt(10));

    //     const decreaseLiquidityParams = {
    //         tokenId: tokenId,
    //         liquidity: liquidity,
    //         amount0Min: amountBase,
    //         amount1Min: amountQuote,
    //         deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now
    //     };

    //     let collectParams = {
    //         tokenId: tokenId,
    //         recipient: owner.address,
    //         amount0Max: amountBase,//ethers.parseUnits("0.1", 18),//ethers.MaxUint256,
    //         amount1Max: amountQuote//ethers.parseUnits("0.001", 18)//ethers.MaxUint256
    //     };


    //     const txDecrease = await positionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
    //     const receiptDecrease = await txDecrease.wait();

    //     for(let i = 0; i < receiptDecrease.logs.length; i++){
    //         if(receiptDecrease.logs[i].fragment){
    //             if(receiptDecrease.logs[i].fragment.type == "event" && receiptDecrease.logs[i].fragment.name == "DecreaseLiquidity"){

    //                 collectParams = {
    //                     tokenId: tokenId,
    //                     recipient: owner.address,
    //                     amount0Max: receiptDecrease.logs[i].args[2] * BigInt(10),
    //                     amount1Max: receiptDecrease.logs[i].args[3] * BigInt(10)
    //                 };
    //                 console.log("collectParams", collectParams);
    //             }
    //         }
    //     }

    //     const txCollect = await positionManagerContract.collect(collectParams, { gasLimit: BigInt(1000000) });
    //     const txCollectReceipt = await txCollect.wait();

    //     // Define the event interface for DiamondTransfer
    //     const ifaceDiamondTransfer = new ethers.Interface([
    //         "event DiamondTransfer(uint8 indexed transferType, address sender, address indexed from, address indexed to, uint256 value)"
    //     ]);

    //     // Calculate the topic hash for the DiamondTransfer event
    //     const diamondTransferTopic = ethers.id("DiamondTransfer(uint8,address,address,address,uint256)");

    //     // Filter logs for DiamondTransfer events
    //     const diamondTransferEvent = txCollectReceipt.logs.find(log => log.topics[0] === diamondTransferTopic);
    //     //expect(diamondTransferEvent).to.not.be.null;
    //     if(diamondTransferEvent) {
    //         const decodedEvent = ifaceDiamondTransfer.decodeEventLog("DiamondTransfer",diamondTransferEvent.data, diamondTransferEvent.topics);
    //         const transferType = decodedEvent.transferType;
    //         const sender = decodedEvent.sender;
    //         const from = decodedEvent.from;
    //         const to = decodedEvent.to;
    //         const value = decodedEvent.value;

    //         console.log(`DiamondTransfer event:
    //             transferType: ${transferType}
    //             sender: ${sender}
    //             from: ${from}
    //             to: ${to}
    //             value: ${value}`);
    //         expect(transferType).to.be.equal(1);
    //     } else {
    //         console.log("No DiamondTransfer events found");
    //     }
    //   });
});