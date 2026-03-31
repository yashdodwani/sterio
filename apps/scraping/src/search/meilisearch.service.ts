import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Index, MeiliSearch } from 'meilisearch';
import { NormalizedProduct } from '../common/interfaces';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class MeilisearchService implements OnModuleInit {
	private readonly logger = new Logger(MeilisearchService.name);
	private client: MeiliSearch;
	private index: Index;
	private readonly indexName = 'products';

	constructor(private config: AppConfigService) {
		const host = this.config.meilisearchHost;
		const apiKey = this.config.meilisearchApiKey;

		this.client = new MeiliSearch({
			host,
			apiKey,
		});
	}

	async onModuleInit() {
		try {
			await this.initializeIndex();
			this.logger.log('Meilisearch initialized successfully');
		} catch (error) {
			this.logger.warn(`Meilisearch initialization failed: ${error.message}`);
		}
	}

	/**
	 * Initialize index with settings
	 */
	private async initializeIndex() {
		try {
			this.index = this.client.index(this.indexName);

			// Configure searchable attributes
			await this.index.updateSearchableAttributes([
				'title',
				'brand',
				'category',
				'description',
				'features',
			]);

			// Configure filterable attributes
			await this.index.updateFilterableAttributes([
				'brand',
				'category',
				'price',
				'rating',
				'reviewCount',
				'available',
				'fulfillment',
			]);

			// Configure sortable attributes
			await this.index.updateSortableAttributes([
				'price',
				'rating',
				'reviewCount',
				'lastUpdated',
			]);

			// Configure ranking rules
			await this.index.updateRankingRules([
				'words',
				'typo',
				'proximity',
				'attribute',
				'sort',
				'exactness',
				'rating:desc',
				'reviewCount:desc',
			]);

			this.logger.log('Meilisearch index configured');
		} catch (error) {
			this.logger.error(`Failed to configure index: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Index a single product
	 */
	async indexProduct(product: NormalizedProduct): Promise<void> {
		try {
			await this.index.addDocuments([this.prepareDocument(product)], {
				primaryKey: 'asin',
			});
		} catch (error) {
			this.logger.error(
				`Failed to index product ${product.asin}: ${error.message}`,
			);
			throw error;
		}
	}

	/**
	 * Index multiple products
	 */
	async indexProducts(products: NormalizedProduct[]): Promise<void> {
		try {
			this.logger.log(`Indexing ${products.length} products...`);

			const documents = products.map((p) => this.prepareDocument(p));

			const task = await this.index.addDocuments(documents, {
				primaryKey: 'asin',
			});

			this.logger.log(`Indexing task queued: ${task.taskUid}`);
		} catch (error) {
			this.logger.error(`Failed to index products: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Search products
	 */
	async search(
		query: string,
		options?: {
			filters?: string;
			sort?: string[];
			limit?: number;
			offset?: number;
		},
	): Promise<any> {
		try {
			const searchOptions: any = {
				limit: options?.limit || 20,
				offset: options?.offset || 0,
			};

			if (options?.filters) {
				searchOptions.filter = options.filters;
			}

			if (options?.sort) {
				searchOptions.sort = options.sort;
			}

			const results = await this.index.search(query, searchOptions);

			return results;
		} catch (error) {
			this.logger.error(`Search failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get product by ASIN
	 */
	async getProduct(asin: string): Promise<any> {
		try {
			return await this.index.getDocument(asin);
		} catch (error) {
			this.logger.error(`Failed to get product ${asin}: ${error.message}`);
			return null;
		}
	}

	/**
	 * Delete product
	 */
	async deleteProduct(asin: string): Promise<void> {
		try {
			await this.index.deleteDocument(asin);
		} catch (error) {
			this.logger.error(`Failed to delete product ${asin}: ${error.message}`);
		}
	}

	/**
	 * Clear all documents
	 */
	async clearIndex(): Promise<void> {
		try {
			await this.index.deleteAllDocuments();
			this.logger.log('Index cleared');
		} catch (error) {
			this.logger.error(`Failed to clear index: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get index stats
	 */
	async getStats(): Promise<any> {
		try {
			const stats = await this.index.getStats();
			return stats;
		} catch (error) {
			this.logger.error(`Failed to get stats: ${error.message}`);
			return null;
		}
	}

	/**
	 * Health check
	 */
	async isHealthy(): Promise<boolean> {
		try {
			await this.client.health();
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Prepare document for indexing
	 */
	private prepareDocument(product: NormalizedProduct): any {
		return {
			asin: product.asin,
			title: product.title,
			description: product.description,
			brand: product.brand,
			category: product.category,
			price: product.price ? Number(product.price) : null,
			originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
			discountPercent: product.discountPercent,
			rating: product.rating ? Number(product.rating) : null,
			reviewCount: product.reviewCount,
			available: product.available,
			images: product.images,
			productUrl: product.productUrl,
			seller: product.seller,
			fulfillment: product.fulfillment,
			features: product.features,
			lastUpdated: product.lastUpdated.getTime(),
		};
	}
}
