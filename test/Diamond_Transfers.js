const { expect } = require("chai");
const { ethers } = require("hardhat");
const { abi: NonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json');
const { abi: PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');


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


async function getPoolInfo(token0, token1) {
    const [token0, token1, fee, liquidity, slot0] =
    await Promise.all([
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])

    return {
        fee,
        liquidity,
        sqrtPriceX96: slot0[0],
        tick: slot0[1],
    } 
}



describe("Diamond Transfers", function () {
    let owner, addr1;
    let baseToken, quoteToken;
    let baseAddress, quoteAddress, poolAddress;
    let MarketStatus, marketStatus, marketStatusAddress;
    let DiamondHelper, diamondHelper, diamondHelperAddress;
    let Diamond, diamond, diamondAddress;
    let tokenId, liquidity, amount0, amount1;
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

        // Wrap ETH
        wethContract = new ethers.Contract(wethAddress, wethAbi, owner);
        const amount = ethers.parseEther('10');
        const tx = await wethContract.deposit({ value: amount });
        await tx.wait();
        const ownerWETHBalance = await wethContract.balanceOf(owner.address);
        console.log('ETH wrapped into WETH', ownerWETHBalance);


        poolAddress = await seedPool(positionManagerAddress, uniswapV3FactoryAddress, diamondAddress, diamond, wethAddress, wethContract, owner);
        diamond.addSupportedPoolAddress(poolAddress);
      });

      it("Adding liquidity ", async function () {
        const amountBase = ethers.parseUnits("0.1", 18); // 10 token0
        const amountQuote = ethers.parseUnits("0.001", 18); // 10 token1

        positionManagerContract = new ethers.Contract(positionManagerAddress, NonfungiblePositionManagerABI, owner);

        //Add liquidity
        await diamond.approve(positionManagerAddress, amountBase);
        await wethContract.approve(positionManagerAddress, amountQuote);

        const tx = await positionManagerContract.mint({
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

        // Define the event interface for DiamondTransfer
        const ifaceDiamondTransfer = new ethers.Interface([
            "event DiamondTransfer(uint8 indexed transferType, address sender, address indexed from, address indexed to, uint256 value)"
        ]);

        // Calculate the topic hash for the DiamondTransfer event
        const diamondTransferTopic = ethers.id("DiamondTransfer(uint8,address,address,address,uint256)");

        // Filter logs for DiamondTransfer events
        const diamondTransferEvent = receipt.logs.find(log => log.topics[0] === diamondTransferTopic);
        expect(diamondTransferEvent).to.not.be.null;
        if(diamondTransferEvent) {
            const decodedEvent = ifaceDiamondTransfer.decodeEventLog("DiamondTransfer",diamondTransferEvent.data, diamondTransferEvent.topics);
            const transferType = decodedEvent.transferType;
            const sender = decodedEvent.sender;
            const from = decodedEvent.from;
            const to = decodedEvent.to;
            const value = decodedEvent.value;

            console.log(`DiamondTransfer event:
                transferType: ${transferType}
                sender: ${sender}
                from: ${from}
                to: ${to}
                value: ${value}`);
            expect(transferType).to.be.equal(1);
        } else {
            console.log("No DiamondTransfer events found");
        }
      });



      it("Swap for sell ", async function () {
        // let uniswapV3Pool = new ethers.Contract(poolAddress, PoolABI, owner);
        // const amountBase = ethers.parseUnits("0.0000001", 18);

        // await diamond.approve(poolAddress, amountBase);

        // const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        // console.log("ethers.AbiCoder", abiCoder);
        // console.log("sss", abiCoder.encode(["address"], [owner.address]));

        // const swapParams = {
        //     amount0Delta: amountBase, // Amount of token0 to swap
        //     amount1Delta: 0, // Minimum amount of token1 to receive
        //     sqrtPriceLimitX96: 0, // No price limit
        //     data: abiCoder.encode(
        //         ["bytes", "address"],
        //         [path, owner.address]
        //       )
        //     //data: abiCoder.encode(["address"], [owner.address]) // Encode recipient address
        //   };
    
        //   const tx = await uniswapV3Pool.swap(
        //     owner.address,
        //     true, // `true` for token0 -> token1 swap, `false` for token1 -> token0 swap
        //     amountBase,
        //     0,
        //     swapParams
        //   );
    
        //   await tx.wait();

        let swapContract = new ethers.Contract(swapRouterAddress, SwapRouterABI, owner);
        const amountBase = ethers.parseUnits("0.0000001", 18);

        await diamond.approve(swapRouterAddress, amountBase);

        const params = {
            tokenIn: diamondAddress,
            tokenOut: wethAddress,
            fee: 3000,
            recipient: owner.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            amountIn: amountBase,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        };
        
        console.log("Swap parameters:", params);

        // Perform the swap
        const tx = await swapContract.exactInputSingle(params, { gasLimit: BigInt(30000000) }); 
        console.log(tx);
    
        await tx.wait();
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