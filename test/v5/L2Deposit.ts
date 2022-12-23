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

const DAIOptimism = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
const USDCOptimism = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
const USDTOptimism = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"

const DAIArbitrum = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
const USDCArbitrum = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"
const USDTArbitrum = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"

if (isNetwork(Network.Goerli)) {
    contextSuite("L2Deposit", ({ wallet, network, token, tokenlon, uniswap }) => {
        const defaultDeposit: L2Deposit = {
            l2Identifier: L2Identifier.Optimism,
            l1TokenAddr: token.DAI.address,
            l2TokenAddr: DAIOptimism,
            sender: wallet.user.address,
            recipient: wallet.user.address,
            amount: 100,
            salt: signingHelper.generateRandomSalt(),
            expiry: EXPIRY,
            data: "0x", // Need to convert strings to bytes, or error: invalid arrayify value
        }
        it("Should sign and encode valid deposit", async () => {
            const deposit = {
                ...defaultDeposit,
            }
            console.log("DAI balance before:", await token.DAI.balanceOf(wallet.user.address))
            await dealTokenAndApprove(
                wallet.user,
                tokenlon.AllowanceTarget,
                deposit.l1TokenAddr,
                deposit.amount,
            )
            console.log("DAI balance after:", await token.DAI.balanceOf(wallet.user.address))
            console.log("Test Point A")
            console.log("Deposit:", tokenlon.L2Deposit.address)
            const depositSig = await signingHelper.signL2Deposit(deposit, {
                type: SignatureType.EIP712,
                signer: wallet.user,
                verifyingContract: tokenlon.L2Deposit.address,
            })
            console.log("Test Point B")
            const payload = encodingHelper.encodeL2Deposit({
                deposit,
                depositSig,
            })
            console.log("payload:", payload)
            console.log("Test Point C")
            const tx = await tokenlon.UserProxy.connect(wallet.user).toL2Deposit(payload)
            console.log("Test Point D")

            const receipt = await tx.wait()

            console.log("tx:", tx)
            console.log("receipt:", receipt)

            assertEvent(receipt, deposit)
        })

        function assertEvent(receipt: ContractReceipt, deposit: L2Deposit) {
            console.log("Test Point E")
            // const [
            //     {
            //         args: [, depositLog],
            //     },
            // ] = parseLogsByName(tokenlon.L2Deposit, "Deposited", receipt.logs)
            const out = parseLogsByName(tokenlon.L2Deposit, "Deposited", receipt.logs)
            console.log("out:", out)
            console.log("Test Point F")
            // Verify deposit
            // expect(depositLog.l2Identifier).to.equal(deposit.l2Identifier)
            // expect(depositLog.l1TokenAddr).to.equal(deposit.l1TokenAddr)
            // expect(depositLog.l2TokenAddr).to.equal(deposit.l2TokenAddr)
            // expect(depositLog.sender).to.equal(deposit.sender)
            // expect(depositLog.recipient).to.equal(deposit.recipient)
            // expect(depositLog.amount).to.equal(deposit.amount)
            // expect(depositLog.data).to.equal(deposit.data)
        }
    })
}
