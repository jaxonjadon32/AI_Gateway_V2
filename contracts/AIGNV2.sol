// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AIGNV2 is ERC20, Pausable, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
   uint256 public constant MINIMUM_TASK_PAYMENT = 500_000_000_000_000_000;

    mapping(bytes32 => bool) public processedTasks;

    event CIPaymentProcessed(
        address indexed client,
        uint256 amount,
        string taskId
    );

    error InvalidTaskId();
    error TaskAlreadyProcessed();
    error PaymentTooSmall();
    error ZeroAddress();

    constructor(address initialOwner)
        ERC20("AI Agent Gateway Network", "AIGN")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) {
            revert ZeroAddress();
        }

        _mint(initialOwner, MAX_SUPPLY);
    }

    function payForAITask(
        uint256 tokenAmount,
        string calldata taskId
    ) external whenNotPaused returns (bool) {
        if (bytes(taskId).length == 0 || bytes(taskId).length > 100) {
            revert InvalidTaskId();
        }

        if (tokenAmount < MINIMUM_TASK_PAYMENT) {
            revert PaymentTooSmall();
        }

        bytes32 taskHash = keccak256(bytes(taskId));

        if (processedTasks[taskHash]) {
            revert TaskAlreadyProcessed();
        }

        processedTasks[taskHash] = true;

        _transfer(msg.sender, owner(), tokenAmount);

        emit CIPaymentProcessed(
            msg.sender,
            tokenAmount,
            taskId
        );

        return true;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function transfer(
        address to,
        uint256 value
    ) public override whenNotPaused returns (bool) {
        return super.transfer(to, value);
    }

    function approve(
        address spender,
        uint256 value
    ) public override whenNotPaused returns (bool) {
        return super.approve(spender, value);
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, value);
    }
}