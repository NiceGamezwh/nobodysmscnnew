// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VeetoBearerRegistry
/// @notice Plaintext mapping of SMS api account -> Veeto Bearer (public readable by design).
contract VeetoBearerRegistry {
    address public owner;

    mapping(string => string) private bearers;

    event BearerSet(string indexed accountKey, string account, address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setBearer(string calldata account, string calldata bearer) external onlyOwner {
        require(bytes(account).length > 0, "empty account");
        bearers[account] = bearer;
        emit BearerSet(account, account, msg.sender);
    }

    function setBearerBatch(
        string[] calldata accounts,
        string[] calldata bearerTokens
    ) external onlyOwner {
        require(accounts.length == bearerTokens.length, "length mismatch");
        for (uint256 i = 0; i < accounts.length; i++) {
            require(bytes(accounts[i]).length > 0, "empty account");
            bearers[accounts[i]] = bearerTokens[i];
            emit BearerSet(accounts[i], accounts[i], msg.sender);
        }
    }

    function getBearer(string calldata account) external view returns (string memory) {
        return bearers[account];
    }
}