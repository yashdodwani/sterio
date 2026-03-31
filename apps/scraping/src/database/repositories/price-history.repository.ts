import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { PriceHistoryEntity } from '../entities';

@Injectable()
export class PriceHistoryRepository {
	private readonly logger = new Logger(PriceHistoryRepository.name);

	constructor(
		@InjectRepository(PriceHistoryEntity)
		private repository: Repository<PriceHistoryEntity>,
	) {}

	/**
	 * Record price
	 */
	async record(
		asin: string,
		price: number,
		available: boolean,
		seller?: string,
	): Promise<PriceHistoryEntity> {
		const entity = this.repository.create({
			asin,
			price,
			available,
			seller,
		});

		return await this.repository.save(entity);
	}

	/**
	 * Get price history for ASIN
	 */
	async getHistory(
		asin: string,
		days: number = 30,
	): Promise<PriceHistoryEntity[]> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		return await this.repository.find({
			where: {
				asin,
				recordedAt: LessThan(cutoffDate),
			},
			order: { recordedAt: 'DESC' },
		});
	}

	/**
	 * Get lowest price for ASIN
	 */
	async getLowestPrice(asin: string, days: number = 30): Promise<number | null> {
		const history = await this.getHistory(asin, days);

		if (history.length === 0) return null;

		return Math.min(...history.map((h) => Number(h.price)));
	}

	/**
	 * Clean old history
	 */
	async cleanOldHistory(days: number = 90): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		await this.repository
			.createQueryBuilder()
			.delete()
			.where('recordedAt < :cutoffDate', { cutoffDate })
			.execute();

		this.logger.log(`Cleaned price history older than ${days} days`);
	}
}
