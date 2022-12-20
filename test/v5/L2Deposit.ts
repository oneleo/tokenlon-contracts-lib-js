import { expect } from "chai"
import { ContractReceipt } from "ethers"
import { ethers } from "hardhat"

import { Network, isNetwork } from "@network"
import { L2Deposit, SignatureType, encodingHelper, signingHelper } from "@src/v5"

import { dealTokenAndApprove } from "@test/utils/balance"
import { EXPIRY } from "@test/utils/constant"
import { contextSuite } from "@test/utils/context"
import {
    deployERC1271Wallet,
    deployERC1271WalletETHSign,
    parseLogsByName,
} from "@test/utils/contract"

enum L2Identifier {
    Arbitrum,
    Optimism,
}

if (isNetwork(Network.Goerli)) {
    contextSuite("L2Deposit", ({ wallet, network, token, tokenlon, uniswap }) => {
        const defaultDeposit: L2Deposit = {
            l2Identifier: L2Identifier.Arbitrum,
            l1TokenAddr: "0x0",
            l2TokenAddr: "0x0",
            sender: "0x0",
            recipient: "0x0",
            amount: 100,
            salt: signingHelper.generateRandomSalt(),
            expiry: EXPIRY,
            data: "",
        }
        it("Should sign and encode valid order", async () => {
            const order = {
                ...defaultDeposit,
            }
        })
    })
}
