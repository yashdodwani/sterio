import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('price_alerts')
export class PriceAlertEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 50 })
	@Index()
	userId: string;

	@Column({ length: 10 })
	@Index()
	asin: string;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	targetPrice: number;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	@Column({ type: 'timestamp', nullable: true })
	notifiedAt: Date;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
