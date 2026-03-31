import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import {
	AsinTrackingEntity,
	CartEntity,
	ChatSessionEntity,
	OrderEntity,
	PaymentEntity,
	PriceAlertEntity,
	PriceHistoryEntity,
	ProductEntity,
	SyncJobEntity,
	TransactionEntity,
	UserInteractionEntity,
	UserProfileEntity,
} from './entities';
import { PriceHistoryRepository, ProductRepository } from './repositories';

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (config: AppConfigService) => ({
				type: 'postgres',
				url: config.dbUrl,
				// host: config.dbHost,
				// port: config.dbPort,
				// username: config.dbUsername,
				// password: config.dbPassword,
				database: config.dbDatabase,
				entities: [
					ProductEntity,
					PriceHistoryEntity,
					AsinTrackingEntity,
					SyncJobEntity,
					PriceAlertEntity,
					UserProfileEntity,
					UserInteractionEntity,
					ChatSessionEntity,
					CartEntity,
					OrderEntity,
					PaymentEntity,
					TransactionEntity,
				],
				synchronize: config.dbSynchronize,
				migrationsRun: config.dbMigrationsRun,
				logging: config.nodeEnv === 'development',
			}),
		}),
		TypeOrmModule.forFeature([
			ProductEntity,
			PriceHistoryEntity,
			AsinTrackingEntity,
			SyncJobEntity,
			PriceAlertEntity,
			UserProfileEntity,
			UserInteractionEntity,
			ChatSessionEntity,
			CartEntity,
			OrderEntity,
			PaymentEntity,
		]),
	],
	providers: [ProductRepository, PriceHistoryRepository],
	exports: [TypeOrmModule, ProductRepository, PriceHistoryRepository],
})
export class DatabaseModule {}
