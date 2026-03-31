import { Module } from '@nestjs/common';
import { NormalizationModule } from '../normalization/normalization.module';
import { ApifyClientService } from './apify-client.service';
import { BrowserUseClientService } from './browser-use-client.service';
import { RealtimeSearchController } from './realtime-search.controller';
import { RealtimeSearchService } from './realtime-search.service';

@Module({
	imports: [NormalizationModule],
	providers: [
		ApifyClientService,
		BrowserUseClientService,
		RealtimeSearchService,
	],
	controllers: [RealtimeSearchController],
	exports: [RealtimeSearchService, ApifyClientService, BrowserUseClientService],
})
export class RealtimeSearchModule {}
