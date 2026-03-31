import { SyncJobEntity, SyncJobStatus, SyncJobType } from '@/database/entities';
import {
	PriceHistoryRepository,
	ProductRepository,
} from '@/database/repositories';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NormalizationService } from '../normalization/normalization.service';
import { BrowserUseClientService } from '../realtime-search/browser-use-client.service';
import { MeilisearchService } from '../search/meilisearch.service';

@Injectable()
export class AmazonSyncService {
	private readonly logger = new Logger(AmazonSyncService.name);
	private isSyncing = false;

	constructor(
		private readonly browserUseClient: BrowserUseClientService,
		private readonly normalization: NormalizationService,
		private readonly productRepo: ProductRepository,
		private readonly priceHistoryRepo: PriceHistoryRepository,
		private readonly meilisearch: MeilisearchService,
		@InjectRepository(SyncJobEntity)
		private readonly syncJobRepo: Repository<SyncJobEntity>,
	) {}

	/**
	 * Scheduled price refresh (every 12 hours)
	 */
	// @Cron(CronExpression.EVERY_12_HOURS)
	async scheduledPriceRefresh() {
		this.logger.log('Starting scheduled price refresh...');
		await this.priceRefreshSync();
	}

	/**
	 * Scheduled full sync (daily at midnight)
	 */
	// @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async scheduledFullSync() {
		this.logger.log('Starting scheduled full sync...');
		await this.fullSync(['popular search queries']); // You can customize queries
	}

	/**
	 * Full sync: scrape products and index them
	 */
	async fullSync(searchQueries: string[]): Promise<SyncJobEntity> {
		if (this.isSyncing) {
			throw new Error('Sync already in progress');
		}

		this.isSyncing = true;

		const job = await this.createSyncJob(SyncJobType.FULL);

		try {
			this.logger.log(`Starting full sync job ${job.id}`);
			await this.updateJobStatus(job.id, SyncJobStatus.RUNNING);

			let totalProcessed = 0;
			let totalCreated = 0;
			let totalUpdated = 0;
			const errors: string[] = [];

			// Scrape each query
			for (const query of searchQueries) {
				try {
					this.logger.log(`Scraping query: "${query}"`);

					const response = await this.browserUseClient.searchAmazon(
						query,
						{},
						{
							maxResults: 50,
						},
					);
					const normalized = this.normalization.normalizeAndValidate(response.data);

					this.logger.log(
						`Normalized ${normalized.length} products from query "${query}"`,
					);

					// Save to database
					for (const product of normalized) {
						try {
							const existing = await this.productRepo.findByAsin(product.asin);

							await this.productRepo.upsert(product);

							// Record price history
							if (product.price) {
								await this.priceHistoryRepo.record(
									product.asin,
									product.price,
									product.available,
									product.seller,
								);
							}

							totalProcessed++;
							if (existing) {
								totalUpdated++;
							} else {
								totalCreated++;
							}
						} catch (error) {
							errors.push(`Failed to save product ${product.asin}: ${error.message}`);
						}
					}

					// Index in Meilisearch
					try {
						await this.meilisearch.indexProducts(normalized);
					} catch (error) {
						errors.push(
							`Failed to index products for query "${query}": ${error.message}`,
						);
					}
				} catch (error) {
					errors.push(`Failed to scrape query "${query}": ${error.message}`);
				}
			}

			// Update job
			job.productsProcessed = totalProcessed;
			job.productsCreated = totalCreated;
			job.productsUpdated = totalUpdated;
			job.errors = errors.length > 0 ? errors : null;
			job.completedAt = new Date();

			await this.updateJobStatus(job.id, SyncJobStatus.SUCCESS);

			this.logger.log(
				`Full sync completed: ${totalProcessed} processed, ${totalCreated} created, ${totalUpdated} updated`,
			);

			return job;
		} catch (error) {
			this.logger.error(`Full sync failed: ${error.message}`, error.stack);
			await this.updateJobStatus(job.id, SyncJobStatus.FAILED);
			throw error;
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Price refresh sync: update prices for existing products
	 */
	async priceRefreshSync(): Promise<SyncJobEntity> {
		if (this.isSyncing) {
			throw new Error('Sync already in progress');
		}

		this.isSyncing = true;

		const job = await this.createSyncJob(SyncJobType.PRICE_REFRESH);

		try {
			this.logger.log(`Starting price refresh job ${job.id}`);
			await this.updateJobStatus(job.id, SyncJobStatus.RUNNING);

			// Get stale products (older than 12 hours)
			const staleProducts = await this.productRepo.getStaleProducts(12);

			this.logger.log(`Found ${staleProducts.length} stale products`);

			const asins = staleProducts.map((p) => p.asin);
			const errors: string[] = [];
			let totalProcessed = 0;
			let totalUpdated = 0;

			// Fetch products by ASIN one by one
			for (const asin of asins) {
				try {
					const productData = await this.browserUseClient.getProductByAsin(asin);
					const normalized = this.normalization.normalizeAndValidate([productData]);

					for (const product of normalized) {
						try {
							await this.productRepo.upsert(product);

							// Record price history
							if (product.price) {
								await this.priceHistoryRepo.record(
									product.asin,
									product.price,
									product.available,
									product.seller,
								);
							}

							totalProcessed++;
							totalUpdated++;
						} catch (error) {
							errors.push(
								`Failed to update product ${product.asin}: ${error.message}`,
							);
						}
					}

					// Update search index
					try {
						await this.meilisearch.indexProducts(normalized);
					} catch (error) {
						errors.push(`Failed to index batch: ${error.message}`);
					}
				} catch (error) {
					errors.push(`Failed to scrape batch: ${error.message}`);
				}
			}

			// Update job
			job.productsProcessed = totalProcessed;
			job.productsUpdated = totalUpdated;
			job.errors = errors.length > 0 ? errors : null;
			job.completedAt = new Date();

			await this.updateJobStatus(job.id, SyncJobStatus.SUCCESS);

			this.logger.log(
				`Price refresh completed: ${totalProcessed} processed, ${totalUpdated} updated`,
			);

			return job;
		} catch (error) {
			this.logger.error(`Price refresh failed: ${error.message}`, error.stack);
			await this.updateJobStatus(job.id, SyncJobStatus.FAILED);
			throw error;
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Manual sync trigger
	 */
	async manualSync(searchQueries: string[]): Promise<SyncJobEntity> {
		const job = await this.createSyncJob(SyncJobType.MANUAL);

		try {
			return await this.fullSync(searchQueries);
		} catch (error) {
			await this.updateJobStatus(job.id, SyncJobStatus.FAILED);
			throw error;
		}
	}

	/**
	 * Get sync job status
	 */
	async getSyncJobStatus(jobId: string): Promise<SyncJobEntity> {
		return await this.syncJobRepo.findOne({ where: { id: jobId } });
	}

	/**
	 * Get recent sync jobs
	 */
	async getRecentJobs(limit: number = 10): Promise<SyncJobEntity[]> {
		return await this.syncJobRepo.find({
			order: { startedAt: 'DESC' },
			take: limit,
		});
	}

	/**
	 * Create sync job
	 */
	private async createSyncJob(type: SyncJobType): Promise<SyncJobEntity> {
		const job = this.syncJobRepo.create({
			type,
			status: SyncJobStatus.PENDING,
		});

		return await this.syncJobRepo.save(job);
	}

	/**
	 * Update job status
	 */
	private async updateJobStatus(
		jobId: string,
		status: SyncJobStatus,
	): Promise<void> {
		await this.syncJobRepo.update(jobId, { status });
	}
}
