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
const USDCOptimism = "0x7E07E15D2a87A24492740D16f5bdF58c16db0c4E"
const USDTOptimism = "0x853eb4bA5D0Ba2B77a0A5329Fd2110d5CE149ECE"

const DAIArbitrum = ""
const USDCArbitrum = ""
const USDTArbitrum = ""

if (isNetwork(Network.Goerli)) {
    contextSuite("L2Deposit", ({ wallet, network, token, tokenlon, uniswap }) => {
        const defaultDeposit: L2Deposit = {
            l2Identifier: L2Identifier.Arbitrum,
            l1TokenAddr: token.DAI.address,
            l2TokenAddr: DAIOptimism,
            sender: wallet.user.address,
            recipient: wallet.user.address,
            amount: 100,
            salt: signingHelper.generateRandomSalt(),
            expiry: EXPIRY,
            data: "",
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
            const depositSig = await signingHelper.signL2Deposit(deposit, {
                type: SignatureType.EIP712,
                signer: wallet.user,
                verifyingContract: tokenlon.L2Deposit.address,
            })
            const payload = encodingHelper.encodeL2Deposit({
                deposit,
                depositSig,
            })
            const tx = await tokenlon.UserProxy.connect(wallet.user).toL2Deposit(payload)
            const receipt = await tx.wait()

            assertEvent(receipt, deposit)
        })

        function assertEvent(receipt: ContractReceipt, deposit: L2Deposit) {
            const [
                {
                    args: [, depositLog],
                },
            ] = parseLogsByName(tokenlon.L2Deposit, "Deposited", receipt.logs)

            // Verify deposit
            expect(depositLog.l2Identifier).to.equal(deposit.l2Identifier)
            expect(depositLog.l1TokenAddr).to.equal(deposit.l1TokenAddr)
            expect(depositLog.l2TokenAddr).to.equal(deposit.l2TokenAddr)
            expect(depositLog.sender).to.equal(deposit.sender)
            expect(depositLog.recipient).to.equal(deposit.recipient)
            expect(depositLog.amount).to.equal(deposit.amount)
            expect(depositLog.data).to.equal(deposit.data)
        }
    })
}
