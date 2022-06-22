import { Wallet } from "ethers"
import { ethers } from "hardhat"

import network from "@network"
import {
    IAllowanceTarget,
    IAMMWrapperWithPath,
    IERC20,
    IUniswapV2Router,
    IUniswapV3Quoter,
    IUniswapV3Router,
    IUserProxy,
} from "@typechain"

import { dealETH } from "./balance"
import { toBytes32 } from "./bytes"
import { Snapshot } from "./snapshot"

export type Context = {
    wallet: {
        user: Wallet
    }
    token: {
        DAI: IERC20
        WETH: IERC20
    }
    tokenlon: {
        AllowanceTarget: IAllowanceTarget
        AMMWrapperWithPath: IAMMWrapperWithPath
        UserProxy: IUserProxy
    }
    uniswap: {
        UniswapV2Router: IUniswapV2Router
        UniswapV3Quoter: IUniswapV3Quoter
        UniswapV3Router: IUniswapV3Router
    }
    snapshot: Snapshot
}

const __ctx__ = new Promise<Context>(async (resolve) =>
    resolve({
        wallet: {
            user: new Wallet(toBytes32(1), ethers.provider),
        },
        token: {
            DAI: await ethers.getContractAt("IERC20", network.DAI),
            WETH: await ethers.getContractAt("IERC20", network.WETH),
        },
        tokenlon: {
            AllowanceTarget: await ethers.getContractAt(
                "IAllowanceTarget",
                network.AllowanceTarget,
            ),
            AMMWrapperWithPath: await ethers.getContractAt(
                "IAMMWrapperWithPath",
                network.AMMWrapperWithPath,
            ),
            UserProxy: await ethers.getContractAt("IUserProxy", network.UserProxy),
        },
        uniswap: {
            UniswapV2Router: await ethers.getContractAt(
                "IUniswapV2Router",
                network.UniswapV2Router,
            ),
            UniswapV3Quoter: await ethers.getContractAt(
                "IUniswapV3Quoter",
                network.UniswapV3Quoter,
            ),
            UniswapV3Router: await ethers.getContractAt(
                "IUniswapV3Router",
                network.UniswapV3Router,
            ),
        },
        snapshot: await Snapshot.take(),
    }),
)

interface ContextSuiteFunction {
    (title: string, suite: (ctx: Context) => void, decorator?: "only" | "skip"): Promise<void>
    only: (title: string, suite: (ctx: Context) => void) => Promise<void>
    skip: (title: string, suite: (ctx: Context) => void) => Promise<void>
}

export const contextSuite = async function (
    title: string,
    suite: (ctx: Context) => void,
    decorator?: "only" | "skip",
) {
    const ctx = await __ctx__

    ;(decorator ? describe[decorator] : describe)(title, () => {
        let snapshot: Snapshot

        before(async () => {
            await ctx.snapshot.reset()
            await Promise.all(
                Object.values(ctx.wallet).map((w) => dealETH(w, ethers.utils.parseEther("100"))),
            )
        })

        suite(ctx)

        before(async () => {
            snapshot = await Snapshot.take()
        })

        beforeEach(async () => {
            await snapshot.reset()
        })
    })
} as ContextSuiteFunction

contextSuite.only = function (title: string, suite: (ctx: Context) => void) {
    return contextSuite(title, suite, "only")
}

contextSuite.skip = function (title: string, suite: (ctx: Context) => void) {
    return contextSuite(title, suite, "skip")
}

__ctx__.then(() => setTimeout(run, 0))
