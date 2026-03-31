import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
} from '@nestjs/common';
import { ApiResponse } from '../common/dto/response.dto';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Controller('cart')
export class CartController {
	constructor(private readonly cartService: CartService) {}

	/**
	 * GET /api/cart/:userId
	 */
	@Get(':userId')
	async getCart(@Param('userId') userId: string): Promise<ApiResponse<any>> {
		const cart = await this.cartService.getCart(userId);
		return ApiResponse.success(cart, 200, 'Cart retrieved successfully');
	}

	/**
	 * POST /api/cart/:userId/items
	 */
	@Post(':userId/items')
	async addItem(
		@Param('userId') userId: string,
		@Body() dto: AddCartItemDto,
	): Promise<ApiResponse<any>> {
		const cart = await this.cartService.addItem(userId, dto);
		return ApiResponse.success(cart, 201, 'Item added to cart successfully');
	}

	/**
	 * PUT /api/cart/:userId/items/:productId
	 */
	@Put(':userId/items/:productId')
	async updateItem(
		@Param('userId') userId: string,
		@Param('productId') productId: string,
		@Body() dto: UpdateCartItemDto,
	): Promise<ApiResponse<any>> {
		const cart = await this.cartService.updateItem(userId, productId, dto);
		return ApiResponse.success(cart, 200, 'Cart item updated successfully');
	}

	/**
	 * DELETE /api/cart/:userId/items/:productId
	 */
	@Delete(':userId/items/:productId')
	@HttpCode(HttpStatus.OK)
	async removeItem(
		@Param('userId') userId: string,
		@Param('productId') productId: string,
	): Promise<ApiResponse<any>> {
		const cart = await this.cartService.removeItem(userId, productId);
		return ApiResponse.success(cart, 200, 'Item removed from cart successfully');
	}

	/**
	 * DELETE /api/cart/:userId
	 */
	@Delete(':userId')
	@HttpCode(HttpStatus.OK)
	async clearCart(@Param('userId') userId: string): Promise<ApiResponse<null>> {
		await this.cartService.clearCart(userId);
		return ApiResponse.success(null, 200, 'Cart cleared successfully');
	}
}
