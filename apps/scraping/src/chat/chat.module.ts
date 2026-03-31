import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { ChatSessionEntity } from '../database/entities/chat-session.entity';
import { HybridOrchestratorModule } from '../orchestrator/hybrid-orchestrator.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([ChatSessionEntity]),
		HybridOrchestratorModule,
		AppConfigModule,
	],
	providers: [ChatService],
	controllers: [ChatController],
	exports: [ChatService],
})
export class ChatModule {}
