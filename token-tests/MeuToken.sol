// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MeuToken {
    // -----------------------------
    // Metadados do token
    // -----------------------------
    string public name = "MinhaMoeda";
    string public symbol = "MMC";
    uint8 public decimals = 18;

    // Oferta total (quantidade de tokens existentes)
    uint256 public totalSupply;

    // -----------------------------
    // Estado: saldos e permissões
    // -----------------------------
    mapping(address => uint256) private balances;

    // allowed[owner][spender] = quanto o spender pode gastar do owner
    mapping(address => mapping(address => uint256)) private allowed;

    // -----------------------------
    // Eventos (logs públicos)
    // -----------------------------
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    // -----------------------------
    // Construtor: cria o supply inicial
    // -----------------------------
    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balances[msg.sender] = initialSupply;

        // Evento opcional: “mint inicial” costuma ser representado assim
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    // -----------------------------
    // Ler saldo (somente leitura)
    // -----------------------------
    function balanceOf(address owner) public view returns (uint256) {
        return balances[owner];
    }

    // -----------------------------
    // Transferência direta (quem chama envia do próprio saldo)
    // -----------------------------
    function transfer(address to, uint256 value) public returns (bool) {
        require(to != address(0), "Endereco invalido");
        require(balances[msg.sender] >= value, "Saldo insuficiente");

        balances[msg.sender] -= value;
        balances[to] += value;

        emit Transfer(msg.sender, to, value);
        return true;
    }

    // -----------------------------
    // Aprovar alguém para gastar em seu nome
    // -----------------------------
    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0), "Endereco invalido");

        allowed[msg.sender][spender] = value;

        emit Approval(msg.sender, spender, value);
        return true;
    }

    // -----------------------------
    // Consultar quanto um spender pode gastar do owner
    // -----------------------------
    function allowance(
        address owner,
        address spender
    ) public view returns (uint256) {
        return allowed[owner][spender];
    }

    // -----------------------------
    // Transferir do saldo de outra pessoa (com autorização)
    // -----------------------------
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public returns (bool) {
        require(from != address(0) && to != address(0), "Endereco invalido");
        require(balances[from] >= value, "Saldo insuficiente do remetente");
        require(allowed[from][msg.sender] >= value, "Permissao insuficiente");

        // desconta saldo do 'from'
        balances[from] -= value;

        // adiciona saldo no 'to'
        balances[to] += value;

        // reduz a permissão (allowance) do msg.sender
        allowed[from][msg.sender] -= value;

        emit Transfer(from, to, value);
        return true;
    }
}
