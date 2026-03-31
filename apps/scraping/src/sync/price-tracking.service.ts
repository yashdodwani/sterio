import { PriceAlertEntity, PriceHistoryEntity } from '@/database/entities';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';

export interface PriceHistoryPoint {
	price: number;
	timestamp: Date;
	available: boolean;
	seller?: string;
}

export interface PriceAnalytics {
	currentPrice: number;
	averagePrice: number;
	lowestPrice: number;
	highestPrice: number;
	priceChange: number;
	priceChangePercent: number;
	trend: 'up' | 'down' | 'stable';
}

@Injectable()
export class PriceTrackingService {
	private readonly logger = new Logger(PriceTrackingService.name);

	constructor(
		@InjectRepository(PriceHistoryEntity)
		private readonly priceHistoryRepo: Repository<PriceHistoryEntity>,
		@InjectRepository(PriceAlertEntity)
		private readonly priceAlertRepo: Repository<PriceAlertEntity>,
	) {}

	async recordPrice(
		asin: string,
		price: number,
		available: boolean,
		seller?: string,
	): Promise<void> {
		try {
			const priceHistory = this.priceHistoryRepo.create({
				asin,
				price,
				available,
				seller,
			});

			await this.priceHistoryRepo.save(priceHistory);

			// Check for price alerts
			await this.checkPriceAlerts(asin, price);

			this.logger.log(`Recorded price for ${asin}: $${price}`);
		} catch (error) {
			this.logger.error(`Failed to record price for ${asin}`, error);
			throw error;
		}
	}

	async getPriceHistory(
		asin: string,
		period: string = '30d',
	): Promise<PriceHistoryPoint[]> {
		const days = this.parsePeriod(period);
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		const history = await this.priceHistoryRepo.find({
			where: {
				asin,
				recordedAt: MoreThan(startDate),
			},
			order: { recordedAt: 'ASC' },
		});

		return history.map((h) => ({
			price: h.price,
			timestamp: h.recordedAt,
			available: h.available,
			seller: h.seller,
		}));
	}

	async getPriceAnalytics(
		asin: string,
		period: string = '30d',
	): Promise<PriceAnalytics> {
		const history = await this.getPriceHistory(asin, period);

		if (history.length === 0) {
			throw new Error(`No price history found for ${asin}`);
		}

		const prices = history.map((h) => h.price);
		const currentPrice = history[history.length - 1].price;
		const averagePrice =
			prices.reduce((sum, price) => sum + price, 0) / prices.length;
		const lowestPrice = Math.min(...prices);
		const highestPrice = Math.max(...prices);

		const oldestPrice = history[0].price;
		const priceChange = currentPrice - oldestPrice;
		const priceChangePercent = (priceChange / oldestPrice) * 100;

		let trend: 'up' | 'down' | 'stable' = 'stable';
		if (priceChangePercent > 5) trend = 'up';
		else if (priceChangePercent < -5) trend = 'down';

		return {
			currentPrice,
			averagePrice,
			lowestPrice,
			highestPrice,
			priceChange,
			priceChangePercent,
			trend,
		};
	}

	private async checkPriceAlerts(
		asin: string,
		currentPrice: number,
	): Promise<void> {
		const activeAlerts = await this.priceAlertRepo.find({
			where: {
				asin,
				isActive: true,
				targetPrice: MoreThan(currentPrice),
			},
		});

		for (const alert of activeAlerts) {
			// In a real implementation, you would send notifications here
			// For now, just mark as notified
			await this.priceAlertRepo.update(alert.id, {
				notifiedAt: new Date(),
				isActive: false, // Deactivate after notification
			});

			this.logger.log(
				`Price alert triggered for user ${alert.userId}: ${asin} is now $${currentPrice} (target: $${alert.targetPrice})`,
			);
		}
	}

	private parsePeriod(period: string): number {
		const match = period.match(/^(\d+)([hdwm])$/);
		if (!match) return 30; // default 30 days

		const value = parseInt(match[1]);
		const unit = match[2];

		switch (unit) {
			case 'h':
				return Math.ceil(value / 24); // convert hours to days
			case 'd':
				return value;
			case 'w':
				return value * 7;
			case 'm':
				return value * 30;
			default:
				return 30;
		}
	}
}
