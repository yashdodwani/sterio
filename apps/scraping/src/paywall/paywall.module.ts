import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from '../config/app-config.module';
import { ScanService } from './scan.service';
import { X402PaymentGuard } from './x402-payment.guard';

@Module({
	imports: [AppConfigModule, HttpModule],
	providers: [
		ScanService,
		X402PaymentGuard,
		{
			provide: APP_GUARD,
			useClass: X402PaymentGuard,
		},
	],
	exports: [ScanService, X402PaymentGuard],
})
export class PaywallModule {}
