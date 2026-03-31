import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from 'typeorm';

export type InteractionType =
	| 'view'
	| 'click'
	| 'purchase'
	| 'favorite'
	| 'search';

@Entity('user_interactions')
export class UserInteractionEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 50 })
	@Index()
	userId: string;

	@Column({ length: 10 })
	@Index()
	asin: string;

	@Column({
		type: 'enum',
		enum: ['view', 'click', 'purchase', 'favorite', 'search'],
	})
	interactionType: InteractionType;

	@Column({ type: 'jsonb', nullable: true })
	metadata: Record<string, any>;

	@CreateDateColumn()
	@Index()
	timestamp: Date;
}
