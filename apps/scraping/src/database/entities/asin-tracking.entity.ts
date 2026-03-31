import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('asin_tracking')
export class AsinTrackingEntity {
	@PrimaryColumn({ length: 10 })
	asin: string;

	@Column({ length: 255, nullable: true })
	userId: string;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	targetPrice: number;

	@Column({ type: 'boolean', default: true })
	active: boolean;

	@Column({ type: 'int', default: 0 })
	checkCount: number;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	@Index()
	lastChecked: Date;
}
