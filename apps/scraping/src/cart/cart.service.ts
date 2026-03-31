import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity, CartItem } from '../database/entities/cart.entity';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
	private readonly logger = new Logger(CartService.name);

	constructor(
		@InjectRepository(CartEntity)
		private readonly cartRepo: Repository<CartEntity>,
	) {}

	async getCart(userId: string): Promise<CartEntity> {
		let cart = await this.cartRepo.findOne({
			where: { userId, active: true },
		});
		if (!cart) {
			cart = await this.cartRepo.save(
				this.cartRepo.create({ userId, items: [], totalPrice: 0 }),
			);
		}
		return cart;
	}

	async addItem(userId: string, dto: AddCartItemDto): Promise<CartEntity> {
		const cart = await this.getCart(userId);

		const existingIndex = cart.items.findIndex(
			(i) =>
				i.productId === dto.product_id &&
				i.size === dto.size &&
				i.color === dto.color,
		);

		if (existingIndex >= 0) {
			cart.items[existingIndex].quantity += dto.quantity ?? 1;
		} else {
			const newItem: CartItem = {
				productId: dto.product_id,
				name: dto.name,
				image: dto.image,
				size: dto.size,
				color: dto.color,
				price: dto.price,
				quantity: dto.quantity ?? 1,
				retailer: dto.retailer,
				productUrl: dto.product_url,
			};
			cart.items = [...cart.items, newItem];
		}

		cart.totalPrice = this.calcTotal(cart.items);
		return this.cartRepo.save(cart);
	}

	async updateItem(
		userId: string,
		productId: string,
		dto: UpdateCartItemDto,
	): Promise<CartEntity> {
		const cart = await this.getCart(userId);
		const idx = cart.items.findIndex((i) => i.productId === productId);
		if (idx < 0) {
			throw new NotFoundException(`Product ${productId} not in cart`);
		}

		if (dto.quantity === 0) {
			cart.items = cart.items.filter((i) => i.productId !== productId);
		} else {
			cart.items[idx].quantity = dto.quantity;
		}

		cart.totalPrice = this.calcTotal(cart.items);
		return this.cartRepo.save(cart);
	}

	async removeItem(userId: string, productId: string): Promise<CartEntity> {
		const cart = await this.getCart(userId);
		const before = cart.items.length;
		cart.items = cart.items.filter((i) => i.productId !== productId);
		if (cart.items.length === before) {
			throw new NotFoundException(`Product ${productId} not in cart`);
		}
		cart.totalPrice = this.calcTotal(cart.items);
		return this.cartRepo.save(cart);
	}

	async clearCart(userId: string): Promise<void> {
		const cart = await this.getCart(userId);
		cart.items = [];
		cart.totalPrice = 0;
		await this.cartRepo.save(cart);
	}

	private calcTotal(items: CartItem[]): number {
		return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
	}
}
