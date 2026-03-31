import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export type OrderStatus =
	| 'pending'
	| 'payment_processing'
	| 'paid'
	| 'failed'
	| 'refunded';

export interface OrderItem {
	productId: string;
	name: string;
	size?: string;
	color?: string;
	price: number;
	quantity: number;
	retailer?: string;
}

@Entity('orders')
export class OrderEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 100, nullable: true })
	@Index()
	userId: string;

	@Column({ length: 50, nullable: true })
	cartId: string;

	@Column({ type: 'jsonb', default: [] })
	items: OrderItem[];

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	amount: number;

	@Column({ length: 10, default: 'USD' })
	currency: string;

	@Column({ length: 30, default: 'pending' })
	@Index()
	status: OrderStatus;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
