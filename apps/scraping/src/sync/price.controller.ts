import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
	Request,
} from '@nestjs/common';
import {
	CreatePriceAlertDto as CreateAlertDto,
	PriceAlertResponseDto,
	PriceAnalyticsDto,
	PriceHistoryDto,
} from '../common/dto/price.dto';
import { PriceAlertService } from '../sync/price-alert.service';
import { PriceTrackingService } from '../sync/price-tracking.service';

@Controller('price')
export class PriceController {
	constructor(
		private readonly priceTrackingService: PriceTrackingService,
		private readonly priceAlertService: PriceAlertService,
	) {}

	@Get(':asin/history')
	async getPriceHistory(
		@Param('asin') asin: string,
		@Query('period') period: string = '30d',
	): Promise<PriceHistoryDto[]> {
		return this.priceTrackingService.getPriceHistory(asin, period);
	}

	@Get(':asin/analytics')
	async getPriceAnalytics(
		@Param('asin') asin: string,
		@Query('period') period: string = '30d',
	): Promise<PriceAnalyticsDto> {
		return this.priceTrackingService.getPriceAnalytics(asin, period);
	}

	@Post('alerts')
	async createPriceAlert(
		@Body() dto: CreateAlertDto,
		@Request() req: any,
	): Promise<PriceAlertResponseDto> {
		const userId = req.user?.id || 'anonymous'; // In real app, get from auth
		return this.priceAlertService.createAlert({
			...dto,
			userId,
		});
	}

	@Get('alerts')
	async getUserAlerts(@Request() req: any): Promise<PriceAlertResponseDto[]> {
		const userId = req.user?.id || 'anonymous';
		return this.priceAlertService.getUserAlerts(userId);
	}

	@Delete('alerts/:alertId')
	async deletePriceAlert(
		@Param('alertId') alertId: string,
		@Request() req: any,
	): Promise<void> {
		const userId = req.user?.id || 'anonymous';
		return this.priceAlertService.deleteAlert(userId, alertId);
	}
}
