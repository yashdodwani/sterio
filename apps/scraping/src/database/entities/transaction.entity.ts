import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

@Entity('transactions')
export class TransactionEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 100 })
	@Index({ unique: true })
	txHash: string;

	@Column({ length: 100 })
	@Index()
	userId: string;

	@Column({ length: 20, default: 'PENDING' })
	@Index()
	status: TransactionStatus;

	@Column({ length: 100, nullable: true })
	receiver: string;

	@Column({ length: 30, nullable: true })
	originAmount: string;

	@Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
	amount: number;

	@Column({ type: 'text', nullable: true })
	errorMsg: string;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
