import { expect } from "chai"
import { BigNumber, ContractReceipt } from "ethers"
import { ethers } from "hardhat"

import { Network, isNetwork } from "@network"
import {
    L2Deposit,
    L2ArbitrumDepositData,
    SignatureType,
    encodingHelper,
    signingHelper,
} from "@src/v5"

import { dealTokenAndApprove } from "@test/utils/balance"
import { EXPIRY } from "@test/utils/constant"
import { contextSuite } from "@test/utils/context"
import { parseLogsByName } from "@test/utils/contract"

enum L2Identifier {
    Arbitrum,
    Optimism,
}

const zeroAddress = "0x" + "0".repeat(40)
const isArbitrum = false

if (isNetwork(Network.Goerli)) {
    contextSuite("L2Deposit", ({ wallet, network, token, tokenlon, uniswap }) => {
        const defaultDeposit: L2Deposit = {
            l2Identifier: 0,
            l1TokenAddr: zeroAddress,
            l2TokenAddr: zeroAddress,
            sender: wallet.user.address,
            recipient: wallet.user.address,
            amount: 100,
            salt: 1234,
            expiry: EXPIRY,
            data: "0x", // Need to convert strings to bytes, or error: invalid arrayify value
        }
        it("Should sign and encode valid deposit", async () => {
            const arbitrumGasData = {
                maxSubmissionCost: ethers.utils.parseUnits("1", "mwei"),
                maxGas: ethers.utils.parseUnits("1", "mwei"),
                gasPriceBid: ethers.utils.parseUnits("1", "gwei"),
            }
            const optimismGasData = {
                l2Gas: ethers.utils.parseUnits("1", "mwei"),
            }

            const deposit = isArbitrum
                ? {
                      // For Arbitrum bridge
                      ...defaultDeposit,
                      l1TokenAddr: token.USDT.address,
                      l2Identifier: L2Identifier.Arbitrum,
                      l2TokenAddr: token.USDTForArbitrumBridge.address,
                      data: encodingHelper.encodeL2ArbitrumDepositData(
                          wallet.user.address,
                          arbitrumGasData,
                      ),
                  }
                : {
                      // For Optimism bridge
                      ...defaultDeposit,
                      l1TokenAddr: token.DAI.address,
                      l2Identifier: L2Identifier.Optimism,
                      l2TokenAddr: zeroAddress, // It does not matter for Optimism bridge
                      data: encodingHelper.encodeL2OptimismDepositData(optimismGasData),
                  }
            console.log("DAI balance before:", await token.DAI.balanceOf(wallet.user.address))
            console.log("data:", deposit.data)
            await dealTokenAndApprove(
                wallet.user,
                tokenlon.AllowanceTarget,
                deposit.l1TokenAddr,
                defaultDeposit.amount,
            )
            console.log("DAI balance after:", await token.DAI.balanceOf(wallet.user.address))
            console.log(await wallet.user.getBalance())
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
            console.log("calculateArbitrumCallValue:", calculateArbitrumCallValue(arbitrumGasData))
            console.log("mwei:", ethers.utils.parseUnits("1", "mwei"))
            console.log("gwei:", ethers.utils.parseUnits("1", "gwei"))
            console.log("Test Point C")
            const tx = isArbitrum
                ? await tokenlon.UserProxy.connect(wallet.user).toL2Deposit(payload, {
                      value: calculateArbitrumCallValue(arbitrumGasData),
                  })
                : await tokenlon.UserProxy.connect(wallet.user).toL2Deposit(payload)
            console.log("Test Point D")
            console.log("calculateArbitrumCallValue:", calculateArbitrumCallValue(arbitrumGasData))

            const receipt = await tx.wait()

            // console.log("tx:", tx)
            // console.log("receipt:", receipt)

            assertEvent(receipt, deposit)
            console.log("DAI balance after after:", await token.DAI.balanceOf(wallet.user.address))
        })

        function calculateArbitrumCallValue(data: L2ArbitrumDepositData) {
            const maxSubmissionCost = BigNumber.from(data.maxSubmissionCost)
            const maxGas = BigNumber.from(data.maxGas)
            return maxSubmissionCost.add(maxGas.mul(data.gasPriceBid))
        }

        function assertEvent(receipt: ContractReceipt, deposit: L2Deposit) {
            console.log("Test Point E")
            const [{ args }] = parseLogsByName(tokenlon.L2Deposit, "Deposited", receipt.logs)
            console.log("args:", args)
            console.log("Test Point F")
            // Verify deposit
            expect(args.l2Identifier).to.equal(deposit.l2Identifier)
            expect(args.l1TokenAddr).to.equal(deposit.l1TokenAddr)
            expect(args.l2TokenAddr).to.equal(deposit.l2TokenAddr)
            expect(args.sender).to.equal(deposit.sender)
            expect(args.recipient).to.equal(deposit.recipient)
            expect(args.amount).to.equal(deposit.amount)
            expect(args.data).to.equal(deposit.data)
            if (deposit.l2Identifier === L2Identifier.Arbitrum) {
                expect(args.bridgeResponse).to.equal(
                    "0x0000000000000000000000000000000000000000000000000000000000019f0d",
                )
            }
            if (deposit.l2Identifier === L2Identifier.Optimism) {
                expect(args.bridgeResponse).to.equal("0x")
            }
            console.log("Test Point G")
        }
    })
}
