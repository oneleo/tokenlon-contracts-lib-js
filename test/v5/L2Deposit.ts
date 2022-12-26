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

const DAIOptimism = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
const USDCOptimism = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
const USDTOptimism = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"

// const DAIArbitrum = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
const DAIArbitrum = "0x8411120Df646D6c6DA15193Ebe9E436c1c3a5222"
//const USDCArbitrum = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"
const USDCArbitrum = "0x8FB1E3fC51F3b789dED7557E680551d93Ea9d892"
//const USDTArbitrum = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
const USDTArbitrum = "0xB401e876346B3C77DD51781Efba5223d2F1e6697"

const isArbitrum = false

if (isNetwork(Network.Goerli)) {
    contextSuite("L2Deposit", ({ wallet, network, token, tokenlon, uniswap }) => {
        const defaultDeposit: L2Deposit = {
            l2Identifier: L2Identifier.Arbitrum,
            l1TokenAddr: token.DAI.address,
            l2TokenAddr: DAIArbitrum,
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
                      ...defaultDeposit,
                      l2Identifier: L2Identifier.Arbitrum,
                      l2TokenAddr: DAIArbitrum,
                      data: encodingHelper.encodeL2ArbitrumDepositData(
                          wallet.user.address,
                          arbitrumGasData,
                      ),
                  }
                : {
                      ...defaultDeposit,
                      l2Identifier: L2Identifier.Optimism,
                      l2TokenAddr: DAIOptimism,
                      data: encodingHelper.encodeL2OptimismDepositData(optimismGasData),
                  }
            console.log("DAI balance before:", await token.DAI.balanceOf(wallet.user.address))
            console.log("data:", deposit.data)
            await dealTokenAndApprove(
                wallet.user,
                tokenlon.AllowanceTarget,
                deposit.l1TokenAddr,
                "100000000000000000000000000",
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
            // const [
            //     {
            //         args: [, depositLog],
            //     },
            // ] = parseLogsByName(tokenlon.L2Deposit, "Deposited", receipt.logs)
            const [{ args }] = parseLogsByName(tokenlon.L2Deposit, "Deposited", receipt.logs)
            console.log("out:", args)
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
            // expect(args.bridgeResponse).to.equal("0x")
            console.log("Test Point G")
        }
    })
}
