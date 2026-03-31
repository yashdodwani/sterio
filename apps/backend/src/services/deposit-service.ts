import { Context, Effect } from "effect"
import type {
  DatabaseError,
  DepositDuplicateError,
  DepositFundingError,
  DepositUserNotFoundError,
} from "../lib/errors.js"

export interface DepositResult {
  orderId: string
  amountPAS: string
  amountUSDC: string
  crossmintFundingStatus: "funded"
}

export interface DepositServiceShape {
  confirmDeposit(
    userId: string,
    address: string,
    amountPAS: string,
    transactionHash: string,
  ): Effect.Effect<
    DepositResult,
    | DatabaseError
    | DepositDuplicateError
    | DepositFundingError
    | DepositUserNotFoundError
  >
}

export class DepositService extends Context.Tag("DepositService")<
  DepositService,
  DepositServiceShape
>() {}
