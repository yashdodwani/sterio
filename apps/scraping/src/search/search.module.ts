import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CachedSearchController } from './cached-search.controller';
import { CachedSearchService } from './cached-search.service';
import { MeilisearchService } from './meilisearch.service';

@Module({
	imports: [DatabaseModule],
	providers: [MeilisearchService, CachedSearchService],
	controllers: [CachedSearchController],
	exports: [MeilisearchService, CachedSearchService],
})
export class SearchModule {}
