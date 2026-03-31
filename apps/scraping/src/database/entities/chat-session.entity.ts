import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	toolCallId?: string;
	toolName?: string;
	timestamp: string;
}

@Entity('chat_sessions')
export class ChatSessionEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 100, nullable: true })
	@Index()
	userId: string;

	@Column({ type: 'jsonb', default: [] })
	messages: ChatMessage[];

	@Column({ type: 'jsonb', nullable: true })
	lastIntent: Record<string, any>;

	@Column({ type: 'boolean', default: true })
	active: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
