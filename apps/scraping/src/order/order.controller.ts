import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
} from '@nestjs/common';
import { ApiResponse } from '../common/dto/response.dto';
import { CheckoutDto } from './dto/order.dto';
import { OrderService } from './order.service';

@Controller('')
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

	/**
	 * POST /api/checkout
	 * Create a new order from cart
	 */
	@Post('checkout')
	async checkout(@Body() dto: CheckoutDto): Promise<ApiResponse<any>> {
		const result = await this.orderService.checkout(dto);
		return ApiResponse.success(result, 201, 'Order created successfully');
	}

	/**
	 * GET /api/orders?user_id=...
	 */
	@Get('orders')
	async getOrders(@Query('user_id') userId: string): Promise<ApiResponse<any>> {
		const orders = await this.orderService.getOrdersByUser(userId);
		return ApiResponse.success(orders, 200, 'Orders retrieved successfully');
	}

	/**
	 * GET /api/orders/:orderId
	 */
	@Get('orders/:orderId')
	async getOrder(
		@Param('orderId', ParseUUIDPipe) orderId: string,
	): Promise<ApiResponse<any>> {
		const order = await this.orderService.getOrderById(orderId);
		return ApiResponse.success(order, 200, 'Order retrieved successfully');
	}
}
