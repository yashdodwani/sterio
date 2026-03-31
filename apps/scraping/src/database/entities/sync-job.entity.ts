import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export enum SyncJobType {
	FULL = 'full',
	PRICE_REFRESH = 'price_refresh',
	MANUAL = 'manual',
}

export enum SyncJobStatus {
	PENDING = 'pending',
	RUNNING = 'running',
	SUCCESS = 'success',
	FAILED = 'failed',
}

@Entity('sync_jobs')
export class SyncJobEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({
		type: 'enum',
		enum: SyncJobStatus,
		default: SyncJobStatus.PENDING,
	})
	@Index()
	status: SyncJobStatus;

	@Column({
		type: 'enum',
		enum: SyncJobType,
	})
	@Index()
	type: SyncJobType;

	@Column({ type: 'int', default: 0 })
	productsProcessed: number;

	@Column({ type: 'int', default: 0 })
	productsUpdated: number;

	@Column({ type: 'int', default: 0 })
	productsCreated: number;

	@Column({ type: 'json', nullable: true })
	errors: string[];

	@CreateDateColumn()
	@Index()
	startedAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@Column({ type: 'timestamp', nullable: true })
	completedAt: Date;
}
