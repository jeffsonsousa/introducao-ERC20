// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MeuToken {

string public name = "MinhaMoeda";
string public symbol = "MMC";
uint8 public decimals = 18;
uint256 public totalSupply;

mapping(address => uint256) private balances;

constructor(uint256 initialSupply) {
    totalSupply = initialSupply;
    balances[msg.sender] = initialSupply;
}

function balanceOf(address owner) public view returns (uint256) {
    return balances[owner];
}

event Transfer(address indexed from, address indexed to, uint256 value);

function transfer(address to, uint256 value) public returns (bool) {
    require(balances[msg.sender] >= value, "Saldo insuficiente");

    balances[msg.sender] -= value;
    balances[to] += value;

    emit Transfer(msg.sender, to, value);
    return true;
}


}

