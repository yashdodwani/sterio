import { Context, Effect } from "effect"
import type { CartItem } from "../db/schema/cart-items.js"
import type {
  DatabaseError,
  CartFullError,
  CartDuplicateItemError,
  CartInvalidProductError,
  CartItemNotFoundError,
} from "../lib/errors.js"

export interface AddCartItemData {
  productId: string
  productName: string
  price: number
  image: string
  size: string
  color: string
  productUrl: string
  retailer: string
}

export interface CartServiceShape {
  listItems(userId: string): Effect.Effect<CartItem[], DatabaseError>

  addItem(
    userId: string,
    data: AddCartItemData,
  ): Effect.Effect<CartItem, CartFullError | CartDuplicateItemError | CartInvalidProductError | DatabaseError>

  removeItem(
    userId: string,
    itemId: string,
  ): Effect.Effect<void, CartItemNotFoundError | DatabaseError>
}

export class CartService extends Context.Tag("CartService")<
  CartService,
  CartServiceShape
>() {}
