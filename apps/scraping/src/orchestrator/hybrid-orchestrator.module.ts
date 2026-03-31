import { Module } from '@nestjs/common';
import { RealtimeSearchModule } from '../realtime-search/realtime-search.module';
import { SearchModule } from '../search/search.module';
import { HybridOrchestratorController } from './hybrid-orchestrator.controller';
import { HybridOrchestratorService } from './hybrid-orchestrator.service';

@Module({
	imports: [SearchModule, RealtimeSearchModule],
	providers: [HybridOrchestratorService],
	controllers: [HybridOrchestratorController],
	exports: [HybridOrchestratorService],
})
export class HybridOrchestratorModule {}
