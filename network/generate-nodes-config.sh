#!/bin/bash

# === CONFIGURÁVEIS ===
BASE_DIR="$(pwd)"
GENESIS_DIR="$BASE_DIR/networkFiles/genesis.json"
KEYS_DIR="$BASE_DIR/networkFiles/keys"
OUTPUT_DIR="$BASE_DIR/Permissioned-Network"
CONFIG_DIR="$OUTPUT_DIR/config"

IP="172.31.0."
START_PORT=30303

# === PREPARA DIRETÓRIOS ===
mkdir -p "$OUTPUT_DIR"
mkdir -p "$CONFIG_DIR"

# Limpa possíveis arquivos antigos
rm -f "$KEYS_DIR/.env"

# === GERA LISTA DE IDENTIFICADORES ===
cd "$KEYS_DIR" || exit 1
ls | grep 0x > .env

# === VARIÁVEIS DE ACUMULAÇÃO ===
accounts_allowlist=""
nodes_allowlist=""
node_index=1
port=$START_PORT
IP_test=$((node_index + 1))

while IFS= read -r identifier; do
    account_id="$identifier"

    # Lê o conteúdo do key.pub (removendo 0x do início)
    pub_key=$(<"$identifier/key.pub")
    pub_key="${pub_key#0x}"

    # Monta enode string
    enode="enode://$pub_key@$IP$IP_test:$port"

    # Adiciona vírgulas se necessário
    if [ "$node_index" -gt 1 ]; then
        accounts_allowlist+=","
        nodes_allowlist+=","
    fi

    accounts_allowlist+="\"$account_id\""
    nodes_allowlist+="\"$enode\""

    # Cria diretório do nó
    NODE_DIR="$OUTPUT_DIR/Node-$node_index/data"
    mkdir -p "$NODE_DIR"

    # Copia chaves
    cp "$identifier/key" "$NODE_DIR/key"
    cp "$identifier/key.pub" "$NODE_DIR/key.pub"

    node_index=$((node_index + 1))
    IP_test=$((IP_test + 1))
    port=$((port + 1))
done < .env

# === CRIA permissions_config.toml ===
PERMISSIONS_CONFIG_PATH="$CONFIG_DIR/permissions_config.toml"

cat <<EOF > "$PERMISSIONS_CONFIG_PATH"
nodes-allowlist = [$nodes_allowlist]
accounts-allowlist = [$accounts_allowlist]
EOF

# === CRIA static-nodes.json ===
STATIC_NODES_PATH="$CONFIG_DIR/static-nodes.json"

cat <<EOF > "$STATIC_NODES_PATH"
[
  $nodes_allowlist
]
EOF

# === COPIA ARQUIVOS PARA CADA NÓ ===
for i in $(seq 1 $((node_index - 1))); do
    cp "$PERMISSIONS_CONFIG_PATH" "$OUTPUT_DIR/Node-$i/data/"
    cp "$STATIC_NODES_PATH" "$OUTPUT_DIR/Node-$i/data/"
done

echo "permissions_config.toml criado em $CONFIG_DIR"
echo "static-nodes.json criado em $CONFIG_DIR"
echo "Arquivos copiados para todos os nós!"
