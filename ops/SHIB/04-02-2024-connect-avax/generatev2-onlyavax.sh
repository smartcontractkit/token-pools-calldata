#!/bin/bash

### Read in chain_id helpers
source ../../chain_ids.sh


SAFE=0xbF6512B1bBEeC3a673Feff43C0A182C2b28DFD9f ## This is not critical to match for the payload to work. 

ARB_TOKEN_POOL=0x6f93AD7963BBdD8C655A0C819B9b79347EE04b70
AVAX_TOKEN_POOL=0x6f6F5645B86b1fD3c4C015822a0E672132D4e2F8
BASE_TOKEN_POOL=0xC026ae03C857093979872C665b13dBBA83B55987
BSC_TOKEN_POOL=0x7f1f90E6b6BAD9fc14ca71224B072541B739beb3
MAINNET_TOKEN_POOL=0x3eC718a22B268d7d9Ce27D2dcAB791174D515920


## Generate chain update calldata for non-avax chains
pnpm start generate-chain-update  --format safe-json --chain-id $ARB --safe $SAFE --token-pool $ARB_TOKEN_POOL --input ops/SHIB/04-02-2024-connect-avax/inputs/otherchains.json --output arb.tx_builder.json
pnpm start generate-chain-update  --format safe-json --chain-id $AVALANCHE --safe $SAFE --token-pool $AVAX_TOKEN_POOL --input ops/SHIB/04-02-2024-connect-avax/inputs/otherchains.json --output avax.tx_builder.json
pnpm start generate-chain-update  --format safe-json --chain-id $BASE --safe $SAFE --token-pool $BASE_TOKEN_POOL --input ops/SHIB/04-02-2024-connect-avax/inputs/otherchains.json --output base.tx_builder.json
pnpm start generate-chain-update  --format safe-json --chain-id $BNB --safe $SAFE --token-pool $BSC_TOKEN_POOL --input ops/SHIB/04-02-2024-connect-avax/inputs/otherchains.json --output bsc.tx_builder.json

## Generate chain update calldata for avax chain

pnpm start generate-chain-update  --format safe-json --chain-id $AVALANCHE --safe $SAFE --token-pool $AVAX_TOKEN_POOL --input ops/SHIB/04-02-2024-connect-avax/inputs/avax.json --output avax.tx_builder.json