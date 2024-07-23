// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiUserDCABuyingSellingContract {
    struct DCASettings {
        uint256 buyInterval;
        uint256 buyAmount;
        uint256 sellInterval;
        uint256 sellAmount;
        uint256 lastBuyTime;
        uint256 lastSellTime;
        uint256 tokenBalance;
    }

    struct User {
        address[] quoteTokens;
        mapping(address => DCASettings) quoteTokenSettings;
        uint256 ethBalance;
    }

    address public owner;
    address public baseTokenAddress;
    IERC20 private baseToken;

    mapping(address => User) public users;
    mapping(address => bool) public supportedQuoteTokens;
    address[] public userList;

    event BoughtTokens(address indexed user, address indexed quoteToken, uint256 amount, uint256 timestamp);
    event SoldTokens(address indexed user, address indexed quoteToken, uint256 amount, uint256 timestamp);
    event DepositedTokens(address indexed user, address indexed token, uint256 amount);
    event WithdrawnTokens(address indexed user, address indexed token, uint256 amount);
    event DepositedETH(address indexed user, uint256 amount);
    event WithdrawnETH(address indexed user, uint256 amount);
    event QuoteTokenSupported(address indexed token);
    event QuoteTokenUnsupported(address indexed token);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _baseTokenAddress) {
        owner = msg.sender;
        baseTokenAddress = _baseTokenAddress;
        baseToken = IERC20(_baseTokenAddress);
    }

    function buyTokens(address user, address quoteTokenAddress) public {
        DCASettings storage settings = users[user].quoteTokenSettings[quoteTokenAddress];
        require((block.timestamp - settings.lastBuyTime) > settings.buyInterval, "Interval not reached");
        require(settings.tokenBalance >= settings.buyAmount, "Insufficient token balance");
        require(users[user].ethBalance >= tx.gasprice * gasleft(), "Insufficient ETH for gas");

        // Assuming the base token is being bought from a Uniswap-like DEX
        // You need to integrate with the DEX contract here

        // For simplicity, we are just transferring the quote tokens
        // to another address (like an exchange) in this example
        IERC20(quoteTokenAddress).transfer(address(0xUniswapRouterAddress), settings.buyAmount);
        
        // Add the actual DEX swap code here

        settings.lastBuyTime = block.timestamp;
        settings.tokenBalance -= settings.buyAmount;
        users[user].ethBalance -= tx.gasprice * gasleft();

        emit BoughtTokens(user, quoteTokenAddress, settings.buyAmount, block.timestamp);
    }

    function sellTokens(address user, address quoteTokenAddress) public {
        DCASettings storage settings = users[user].quoteTokenSettings[quoteTokenAddress];
        require((block.timestamp - settings.lastSellTime) > settings.sellInterval, "Interval not reached");
        require(settings.tokenBalance >= settings.sellAmount, "Insufficient token balance");
        require(users[user].ethBalance >= tx.gasprice * gasleft(), "Insufficient ETH for gas");

        // Assuming the base token is being sold to a Uniswap-like DEX
        // You need to integrate with the DEX contract here

        // For simplicity, we are just transferring the base tokens
        // to another address (like an exchange) in this example
        baseToken.transfer(address(0xUniswapRouterAddress), settings.sellAmount);
        
        // Add the actual DEX swap code here

        settings.lastSellTime = block.timestamp;
        settings.tokenBalance -= settings.sellAmount;
        users[user].ethBalance -= tx.gasprice * gasleft();

        emit SoldTokens(user, quoteTokenAddress, settings.sellAmount, block.timestamp);
    }

    function depositTokens(address tokenAddress, uint256 amount) external {
        require(supportedQuoteTokens[tokenAddress], "Token not supported");
        require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        User storage user = users[msg.sender];
        if (user.quoteTokenSettings[tokenAddress].tokenBalance == 0) {
            user.quoteTokens.push(tokenAddress);
            if (user.quoteTokens.length == 1) {
                userList.push(msg.sender);
            }
        }
        user.quoteTokenSettings[tokenAddress].tokenBalance += amount;

        emit DepositedTokens(msg.sender, tokenAddress, amount);
    }

    function depositBaseTokens(uint256 amount) external {
        require(baseToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        User storage user = users[msg.sender];
        if (user.quoteTokenSettings[baseTokenAddress].tokenBalance == 0) {
            user.quoteTokens.push(baseTokenAddress);
            if (user.quoteTokens.length == 1) {
                userList.push(msg.sender);
            }
        }
        user.quoteTokenSettings[baseTokenAddress].tokenBalance += amount;

        emit DepositedTokens(msg.sender, baseTokenAddress, amount);
    }

    function depositETH() external payable {
        users[msg.sender].ethBalance += msg.value;
        if (users[msg.sender].quoteTokens.length == 0) {
            userList.push(msg.sender);
        }

        emit DepositedETH(msg.sender, msg.value);
    }

    function setBuyInterval(address tokenAddress, uint256 _buyInterval) external {
        users[msg.sender].quoteTokenSettings[tokenAddress].buyInterval = _buyInterval;
    }

    function setBuyAmount(address tokenAddress, uint256 _buyAmount) external {
        users[msg.sender].quoteTokenSettings[tokenAddress].buyAmount = _buyAmount;
    }

    function setSellInterval(address tokenAddress, uint256 _sellInterval) external {
        users[msg.sender].quoteTokenSettings[tokenAddress].sellInterval = _sellInterval;
    }

    function setSellAmount(address tokenAddress, uint256 _sellAmount) external {
        users[msg.sender].quoteTokenSettings[tokenAddress].sellAmount = _sellAmount;
    }

    function withdrawTokens(address tokenAddress, uint256 amount) external {
        DCASettings storage settings = users[msg.sender].quoteTokenSettings[tokenAddress];
        require(settings.tokenBalance >= amount, "Insufficient balance");
        settings.tokenBalance -= amount;
        if (settings.tokenBalance == 0) {
            removeUserToken(msg.sender, tokenAddress);
        }
        require(IERC20(tokenAddress).transfer(msg.sender, amount), "Withdrawal failed");

        emit WithdrawnTokens(msg.sender, tokenAddress, amount);
    }

    function withdrawETH(uint256 amount) external {
        require(users[msg.sender].ethBalance >= amount, "Insufficient ETH balance");
        users[msg.sender].ethBalance -= amount;
        if (users[msg.sender].ethBalance == 0 && users[msg.sender].quoteTokens.length == 0) {
            removeUser(msg.sender);
        }
        payable(msg.sender).transfer(amount);

        emit WithdrawnETH(msg.sender, amount);
    }

    function setSupportedQuoteToken(address tokenAddress, bool isSupported) external onlyOwner {
        supportedQuoteTokens[tokenAddress] = isSupported;
        if (isSupported) {
            emit QuoteTokenSupported(tokenAddress);
        } else {
            emit QuoteTokenUnsupported(tokenAddress);
        }
    }

    function getUsers(uint256 start, uint256 count) external view returns (address[] memory) {
        uint256 end = start + count > userList.length ? userList.length : start + count;
        address[] memory result = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = userList[i];
        }
        return result;
    }

    function getUserQuoteTokens(address user) external view returns (address[] memory) {
        return users[user].quoteTokens;
    }

    function removeUser(address user) internal {
        uint256 index;
        bool found;
        for (index = 0; index < userList.length; index++) {
            if (userList[index] == user) {
                found = true;
                break;
            }
        }
        if (found) {
            userList[index] = userList[userList.length - 1];
            userList.pop();
        }
    }

    function removeUserToken(address user, address tokenAddress) internal {
        uint256 index;
        bool found;
        for (index = 0; index < users[user].quoteTokens.length; index++) {
            if (users[user].quoteTokens[index] == tokenAddress) {
                found = true;
                break;
            }
        }
        if (found) {
            users[user].quoteTokens[index] = users[user].quoteTokens[users[user].quoteTokens.length - 1];
            users[user].quoteTokens.pop();
            if (users[user].quoteTokens.length == 0) {
                removeUser(user);
            }
        }
    }

    receive() external payable {
        depositETH();
    }
}
