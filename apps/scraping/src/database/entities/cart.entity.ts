import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export interface CartItem {
	productId: string;
	name: string;
	image?: string;
	size?: string;
	color?: string;
	price: number;
	quantity: number;
	retailer?: string;
	productUrl?: string;
}

@Entity('carts')
export class CartEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 100 })
	@Index()
	userId: string;

	@Column({ type: 'jsonb', default: [] })
	items: CartItem[];

	@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
	totalPrice: number;

	@Column({ length: 10, default: 'USD' })
	currency: string;

	@Column({ type: 'boolean', default: true })
	active: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
