import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from '../database/entities/cart.entity';
import { OrderEntity, OrderItem } from '../database/entities/order.entity';
import { CheckoutDto } from './dto/order.dto';

@Injectable()
export class OrderService {
	private readonly logger = new Logger(OrderService.name);

	constructor(
		@InjectRepository(OrderEntity)
		private readonly orderRepo: Repository<OrderEntity>,
		@InjectRepository(CartEntity)
		private readonly cartRepo: Repository<CartEntity>,
	) {}

	async checkout(dto: CheckoutDto): Promise<{
		order_id: string;
		amount: number;
		currency: string;
		network: string;
		items: OrderItem[];
	}> {
		const cart = await this.cartRepo.findOne({
			where: { id: dto.cart_id, userId: dto.user_id, active: true },
		});

		if (!cart) {
			throw new NotFoundException(
				`Cart ${dto.cart_id} not found for user ${dto.user_id}`,
			);
		}

		if (cart.items.length === 0) {
			throw new BadRequestException('Cart is empty');
		}

		const items: OrderItem[] = cart.items.map((i) => ({
			productId: i.productId,
			name: i.name,
			size: i.size,
			color: i.color,
			price: i.price,
			quantity: i.quantity,
			retailer: i.retailer,
		}));

		const order = await this.orderRepo.save(
			this.orderRepo.create({
				userId: dto.user_id,
				cartId: cart.id,
				items,
				amount: cart.totalPrice,
				currency: 'USD',
				status: 'pending',
			}),
		);

		this.logger.log(`Order created: ${order.id} for user ${dto.user_id}`);

		return {
			order_id: order.id,
			amount: order.amount,
			currency: 'DOT',
			network: 'polkadot',
			items: order.items,
		};
	}

	async getOrdersByUser(userId: string): Promise<OrderEntity[]> {
		return this.orderRepo.find({
			where: { userId },
			order: { createdAt: 'DESC' },
		});
	}

	async getOrderById(orderId: string): Promise<OrderEntity> {
		const order = await this.orderRepo.findOne({ where: { id: orderId } });
		if (!order) {
			throw new NotFoundException(`Order ${orderId} not found`);
		}
		return order;
	}

	async updateOrderStatus(
		orderId: string,
		status: OrderEntity['status'],
	): Promise<void> {
		const order = await this.getOrderById(orderId);
		order.status = status;
		await this.orderRepo.save(order);
	}
}
