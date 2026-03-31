import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export type PaymentStatus =
	| 'pending'
	| 'processing'
	| 'confirmed'
	| 'failed'
	| 'expired';

@Entity('payments')
export class PaymentEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 50 })
	@Index()
	orderId: string;

	@Column({ length: 100 })
	userId: string;

	/** DOT amount */
	@Column({ type: 'decimal', precision: 18, scale: 6 })
	amount: number;

	@Column({ length: 20, default: 'DOT' })
	token: string;

	@Column({ length: 20, default: 'polkadot' })
	network: string;

	@Column({ length: 255, nullable: true })
	recipientAddress: string;

	@Column({ length: 255, nullable: true })
	senderAddress: string;

	/** Polkadot extrinsic hash */
	@Column({ length: 255, nullable: true, unique: true })
	txHash: string;

	@Column({ length: 30, default: 'pending' })
	@Index()
	status: PaymentStatus;

	/** Expiry: unpaid orders expire after 15 minutes */
	@Column({ type: 'timestamptz', nullable: true })
	expiresAt: Date;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
