import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('user_profiles')
export class UserProfileEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 50, unique: true })
	@Index()
	userId: string;

	@Column({ type: 'jsonb', default: {} })
	preferences: Record<string, any>;

	@Column({ type: 'text', array: true, default: [] })
	favoriteCategories: string[];

	@Column({ type: 'text', array: true, default: [] })
	searchHistory: string[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
