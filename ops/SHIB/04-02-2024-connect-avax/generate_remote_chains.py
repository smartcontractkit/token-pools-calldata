#!/usr/bin/env python3
import json
from copy import deepcopy
from typing import Dict


ARB_TOKEN_POOL="0x6f93AD7963BBdD8C655A0C819B9b79347EE04b70"
AVAX_TOKEN_POOL="0x6f6F5645B86b1fD3c4C015822a0E672132D4e2F8"
BASE_TOKEN_POOL="0xC026ae03C857093979872C665b13dBBA83B55987"
BSC_TOKEN_POOL="0x7f1f90E6b6BAD9fc14ca71224B072541B739beb3"
MAINNET_TOKEN_POOL="0x3eC718a22B268d7d9Ce27D2dcAB791174D515920"

AVAX_SELECTOR="6433500567565415381"
ARB_SELECTOR="4949039107694359620"
BASE_SELECTOR="15971525489660198786"
BSC_SELECTOR="11344663589394136015"



def pad_address_to_bytes(address: str) -> str:
    """Convert an Ethereum address to bytes format with left padding and 0x prefix."""
    clean_address = address.replace('0x', '')
    padded = clean_address.zfill(64)  # zfill is Python's equivalent to padStart
    return f"0x{padded}"



def update_tx_builder(template: Dict, selector_to_pool: Dict[str, str]) -> Dict:
    """Update the transaction builder template with new transactions."""
    # Deep copy the template and the first transaction to avoid mutations
    updated_template = deepcopy(template)
    tx_template = deepcopy(template['transactions'][0])
    
    # Create new transactions list
    new_transactions = []
    
    # Create a transaction for each selector-pool pair
    for selector, pool_address in selector_to_pool.items():
        new_tx = deepcopy(tx_template)
        new_tx['contractInputsValues'] = {
            'remoteChainSelector': selector,
            'remotePoolAddress': pad_address_to_bytes(pool_address)
        }
        new_transactions.append(new_tx)
    
    # Update template with new transactions
    updated_template['transactions'] = new_transactions
    return updated_template

def main():
    # Example selector to pool mapping
    print("running")
    selector_to_pool = {
        ARB_SELECTOR:ARB_TOKEN_POOL,
        BASE_SELECTOR:BASE_TOKEN_POOL,
        BSC_SELECTOR:BSC_TOKEN_POOL
    }

    # Template JSON
    tx_builder_template = {
        "version": "1.0",
        "chainId": "43114",
        "createdAt": 1738784020211,
        "meta": {
            "name": "Token Pool Chain Updates",
            "description": "",
            "txBuilderVersion": "1.18.0",
            "createdFromSafeAddress": "0xbF6512B1bBEeC3a673Feff43C0A182C2b28DFD9f",
            "createdFromOwnerAddress": "",
            "checksum": "0x9e720fd0c8bace9ee9ac950de106fd7d1081311426122e814e5c094c602a4cd6"
        },
        "transactions": [{
            "to": "0x6f6F5645B86b1fD3c4C015822a0E672132D4e2F8",
            "value": "0",
            "data": None,
            "contractMethod": {
                "inputs": [{
                    "internalType": "uint64",
                    "name": "remoteChainSelector",
                    "type": "uint64"
                }, {
                    "internalType": "bytes",
                    "name": "remotePoolAddress",
                    "type": "bytes"
                }],
                "name": "addRemotePool",
                "payable": False
            },
            "contractInputsValues": {
                "remoteChainSelector": "0",
                "remotePoolAddress": "0x0"
            }
        }]
    }

    try:
        # Update the template
        updated_template = update_tx_builder(tx_builder_template, selector_to_pool)
        
        # Write to new file
        output_filename = 'updated_tx_builder.json'
        with open(output_filename, 'w') as f:
            json.dump(updated_template, f, indent=2)
        
    
        print("\nFull updated template:")
        print(json.dumps(updated_template, indent=2))
        
        print(f"\nSuccessfully wrote updated template to {output_filename}")
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()