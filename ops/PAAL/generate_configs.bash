#!/bin/bash
## Base
 pnpm start generate-token-deployment   -i ops/PAAL/paal-bnm-token-and-pool.json  -d 0xF63E11BF2bd0bD2Dcc7d2dd8C66B3ad9661260d3   --salt 0x0000000000000932000000000000000000001800000000000000000123456789   -f safe-json   -s 0xEC8Bb965099d3563d337E903765201A79f631Cba   -w 0xEC8Bb965099d3563d337E903765201A79f631Cba   -c 8453   -o  ops/PAAL/output/base-deployment.json
 ## BSC
 pnpm start generate-token-deployment   -i ops/PAAL/paal-bnm-token-and-pool.json  -d 0xe014B42439eeB47ac8dEB1a02d03020535B369f5   --salt 0x0000000000000932000000000000000000001800000000000000000123456789   -f safe-json   -s 0xEC8Bb965099d3563d337E903765201A79f631Cba   -w 0xEC8Bb965099d3563d337E903765201A79f631Cba   -c 56   -o  ops/PAAL/output/bnb-deployment.json
 ## Mainnet
pnpm start generate-pool-deployment  -i ops/PAAL/paal-mainnet-pool-deployment.json  -d 0x17D8a409fE2ceF2d3808bcB61F14aBEFfc28876e   --salt 0x0000000000000932000000000000000000001800000000000000000123456789   -f safe-json   -s 0xEC8Bb965099d3563d337E903765201A79f631Cba   -w 0xEC8Bb965099d3563d337E903765201A79f631Cba   -c 1   -o  ops/PAAL/output/mainnet-deployment.json

## Chain updates
## Mainnet
pnpm start generate-chain-update  -i ops/PAAL/mainnet-chain-update.json -p 0x1A4B0621E90Bdc61d341D89158863458CA745dA2  -f safe-json  -s 0xEC8Bb965099d3563d337E903765201A79f631Cba   -w 0xEC8Bb965099d3563d337E903765201A79f631Cba   -c 1   -o  ops/PAAL/output/mainnet-chain-update.json
## Base
pnpm start generate-chain-update  -i ops/PAAL/mainnet-chain-update.json -p 0x5192bd10f28a0206211ccbb66671118f85c2e539  -f safe-json  -s 0xEC8Bb965099d3563d337E903765201A79f631Cba   -w 0xEC8Bb965099d3563d337E903765201A79f631Cba   -c 8543   -o  ops/PAAL/output/base-chain-update.json