import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePriceAlertDto {
	@IsNotEmpty()
	@IsString()
	asin: string;

	@IsNumber()
	@Min(0)
	targetPrice: number;
}

export class PriceAlertResponseDto {
	id: string;
	asin: string;
	targetPrice: number;
	isActive: boolean;
	createdAt: Date;
	notifiedAt?: Date;
}

export class PriceHistoryDto {
	price: number;
	timestamp: Date;
	available: boolean;
	seller?: string;
}

export class PriceAnalyticsDto {
	currentPrice: number;
	averagePrice: number;
	lowestPrice: number;
	highestPrice: number;
	priceChange: number;
	priceChangePercent: number;
	trend: 'up' | 'down' | 'stable';
}
