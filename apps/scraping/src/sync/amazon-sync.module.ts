import { SyncJobEntity } from '@/database/entities';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { NormalizationModule } from '../normalization/normalization.module';
import { RealtimeSearchModule } from '../realtime-search/realtime-search.module';
import { SearchModule } from '../search/search.module';
import { AmazonSyncController } from './amazon-sync.controller';
import { AmazonSyncService } from './amazon-sync.service';
import { PriceAlertService } from './price-alert.service';
import { PriceTrackingService } from './price-tracking.service';
import { PriceController } from './price.controller';

@Module({
	imports: [
		ScheduleModule.forRoot(),
		TypeOrmModule.forFeature([SyncJobEntity]),
		RealtimeSearchModule,
		NormalizationModule,
		DatabaseModule,
		SearchModule,
	],
	providers: [AmazonSyncService, PriceTrackingService, PriceAlertService],
	controllers: [AmazonSyncController, PriceController],
	exports: [AmazonSyncService],
})
export class AmazonSyncModule {}
