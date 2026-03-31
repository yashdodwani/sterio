import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('price_history')
export class PriceHistoryEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 10 })
	@Index()
	asin: string;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	price: number;

	@Column({ type: 'boolean' })
	available: boolean;

	@Column({ length: 255, nullable: true })
	seller: string;

	@CreateDateColumn()
	@Index()
	recordedAt: Date;
}
