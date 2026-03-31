import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CartModule } from './cart/cart.module';
import { ChatModule } from './chat/chat.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { NormalizationModule } from './normalization/normalization.module';
import { HybridOrchestratorModule } from './orchestrator/hybrid-orchestrator.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { PaywallModule } from './paywall/paywall.module';
import { RealtimeSearchModule } from './realtime-search/realtime-search.module';
import { SearchModule } from './search/search.module';
import { AmazonSyncModule } from './sync/amazon-sync.module';
import { UserModule } from './user/user.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env',
		}),
		AppConfigModule,
		DatabaseModule,
		UserModule,
		NormalizationModule,
		SearchModule,
		RealtimeSearchModule,
		HybridOrchestratorModule,
		AmazonSyncModule,
		ChatModule,
		CartModule,
		OrderModule,
		PaymentModule,
		PaywallModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
