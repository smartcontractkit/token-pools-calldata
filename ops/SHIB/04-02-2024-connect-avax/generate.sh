#!/bin/bash

SAFE=0xbF6512B1bBEeC3a673Feff43C0A182C2b28DFD9f ## This is not critical to match for the payload to work. 

ARB_TOKEN_POOL=0x6f93AD7963BBdD8C655A0C819B9b79347EE04b70
AVAX_TOKEN_POOL=0x6f6F5645B86b1fD3c4C015822a0E672132D4e2F8
BASE_TOKEN_POOL=0xC026ae03C857093979872C665b13dBBA83B55987
BSC_TOKEN_POOL=0x7f1f90E6b6BAD9fc14ca71224B072541B739beb3
MAINNET_TOKEN_POOL=0x3eC718a22B268d7d9Ce27D2dcAB791174D515920
# Generate chain update calldata for non-avax chains
pnpm start generate-chain-update -i ops/SHIB/04-02-2024-connect-avax/inputs/otherchains.json -o ops/SHIB/04-02-2024-connect-avax/outputs/otherchains.calldata.txt
sed s/--SAFE--/$SAFE/g calldata.template.tx_builder.json > tmp1.json
sed s/--CALLDATA--/$(cat outputs/otherchains.calldata.txt | tr -d '\n')/g tmp1.json > tmp2.json
sed s/--TOKENPOOL--/$ARB_TOKEN_POOL/g tmp2.json > outputs/arb.tx_builder.json
sed s/--TOKENPOOL--/$BASE_TOKEN_POOL/g tmp2.json > outputs/base.tx_builder.json
sed s/--TOKENPOOL--/$BSC_TOKEN_POOL/g tmp2.json > outputs/bsc.tx_builder.json
sed s/--TOKENPOOL--/$AVAX_TOKEN_POOL/g tmp2.json > outputs/mainnet.tx_builder.json


## Generate chain update calldata for avax chain

pnpm start generate-chain-update -i ops/SHIB/04-02-2024-connect-avax/inputs/avax.json -o ops/SHIB/04-02-2024-connect-avax/outputs/avax.calldata.txt

sed s/--SAFE--/$SAFE/g calldata.template.tx_builder.json > tmp1.json
sed s/--CALLDATA--/$(cat outputs/avax.calldata.txt | tr -d '\n')/g tmp1.json > tmp2.json
sed s/--TOKENPOOL--/$AVAX_TOKEN_POOL/g tmp2.json > outputs/avax.tx_builder.json

rm tmp1.json tmp2.json