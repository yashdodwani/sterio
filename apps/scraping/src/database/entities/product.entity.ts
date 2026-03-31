import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class ProductEntity {
	@PrimaryColumn({ length: 10 })
	asin: string;

	@Column({ type: 'text' })
	@Index()
	title: string;

	@Column({ type: 'text', nullable: true })
	description: string;

	@Column({ length: 255, nullable: true })
	@Index()
	brand: string;

	@Column({ length: 255, nullable: true })
	@Index()
	category: string;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	@Index()
	price: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	originalPrice: number;

	@Column({ type: 'int', nullable: true })
	discountPercent: number;

	@Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
	@Index()
	rating: number;

	@Column({ type: 'int', nullable: true })
	@Index()
	reviewCount: number;

	@Column({ type: 'boolean', default: true })
	@Index()
	available: boolean;

	@Column({ type: 'json', nullable: true })
	images: string[];

	@Column({ type: 'text' })
	productUrl: string;

	@Column({ length: 255, nullable: true })
	seller: string;

	@Column({ length: 50, nullable: true })
	fulfillment: string;

	@Column({ type: 'json', nullable: true })
	features: string[];

	@Column({ type: 'json', nullable: true })
	specifications: Record<string, any>;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	@Index()
	lastUpdated: Date;
}
