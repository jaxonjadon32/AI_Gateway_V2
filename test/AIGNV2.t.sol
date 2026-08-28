// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AIGNV2 } from "../contracts/AIGNV2.sol";

contract AIGNV2Test {
    AIGNV2 token;

    address owner = address(0x100);

    uint256 constant ONE_AIGN = 1 ether;
    uint256 constant HALF_AIGN = 0.5 ether;
    uint256 constant TOTAL_SUPPLY = 100_000_000 ether;

    function setUp() public {
        token = new AIGNV2(owner);
    }

    function testTotalSupply() public view {
        require(
            token.totalSupply() == TOTAL_SUPPLY,
            "wrong total supply"
        );
    }

    function testDecimals() public view {
        require(
            token.decimals() == 18,
            "wrong decimals"
        );
    }

    function testNameAndSymbol() public view {
        require(
            keccak256(bytes(token.name())) ==
                keccak256(bytes("AI Agent Gateway Network")),
            "wrong name"
        );

        require(
            keccak256(bytes(token.symbol())) ==
                keccak256(bytes("AIGN")),
            "wrong symbol"
        );
    }

    function testInitialOwnerBalance() public view {
        require(
            token.balanceOf(owner) == TOTAL_SUPPLY,
            "wrong owner balance"
        );
    }

    function testMaximumSupplyConstant() public view {
        require(
            token.MAX_SUPPLY() == TOTAL_SUPPLY,
            "wrong max supply"
        );
    }

    function testMinimumTaskPayment() public view {
        require(
            token.MINIMUM_TASK_PAYMENT() == HALF_AIGN,
            "wrong minimum payment"
        );
    }

    function testInitialPausedState() public view {
        require(
            !token.paused(),
            "contract starts paused"
        );
    }

    function testInitialTaskState() public view {
        bytes32 taskHash = keccak256(bytes("TEST_TASK"));

        require(
            !token.processedTasks(taskHash),
            "task incorrectly processed"
        );
    }

    function testNoAdditionalMinting() public view {
        require(
            token.totalSupply() == TOTAL_SUPPLY,
            "supply changed"
        );
    }

    function testOwnerIsCorrect() public view {
        require(
            token.owner() == owner,
            "wrong owner"
        );
    }

    function testEmptyTaskIdRejected() public {
        try token.payForAITask(HALF_AIGN, "") {
            revert("empty task accepted");
        } catch {
        }
    }

    function testSmallPaymentRejected() public {
        try token.payForAITask(HALF_AIGN - 1, "SMALL_TASK") {
            revert("small payment accepted");
        } catch {
        }
    }

    function testOversizedTaskIdRejected() public {
        string memory longTask =
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        try token.payForAITask(HALF_AIGN, longTask) {
            revert("oversized task accepted");
        } catch {
        }
    }
}
