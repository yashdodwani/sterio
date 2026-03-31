import { Injectable, Logger } from '@nestjs/common';
import { SearchFilters, SearchResult } from '../common/interfaces';
import { NormalizationService } from '../normalization/normalization.service';
import { ApifyClientService } from './apify-client.service';
import { BrowserUseClientService } from './browser-use-client.service';

@Injectable()
export class RealtimeSearchService {
	private readonly logger = new Logger(RealtimeSearchService.name);

	constructor(
		private readonly apifyClient: ApifyClientService,
		private readonly browserUseClient: BrowserUseClientService,
		private readonly normalization: NormalizationService,
	) {}

	/**
	 * Perform realtime search via Apify e-commerce scraping tool
	 */
	async search(
		query: string,
		filters?: SearchFilters,
		page: number = 1,
		limit: number = 20,
	): Promise<SearchResult> {
		const startTime = Date.now();

		try {
			// Call Apify e-commerce scraping tool
			const apifyResponse = await this.apifyClient.searchAmazon(query, filters, {
				limit,
				page,
			});

			// Normalize results
			const normalizedProducts = this.normalization.normalizeAndValidate(
				apifyResponse.data.items,
			);
			// // Apply additional filters
			// const filteredProducts = this.applyFilters(normalizedProducts, filters);

			const executionTime = Date.now() - startTime;
			const total = apifyResponse.data.total;
			const totalPage = Math.ceil(total / limit);

			return {
				products: normalizedProducts,
				total,
				page,
				limit,
				totalPage,
				source: 'realtime',
				query,
				executionTime,
			};
		} catch (error) {
			this.logger.error(`Realtime search failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Get product by ASIN (realtime)
	 */
	async getProductByAsin(asin: string): Promise<any> {
		try {
			this.logger.log(`Realtime product fetch: ${asin}`);

			const rawProduct = await this.apifyClient.getProductByAsin(asin);
			const normalized = this.normalization.normalize(rawProduct);

			if (!normalized) {
				throw new Error(`Failed to normalize product ${asin}`);
			}

			return normalized;
		} catch (error) {
			this.logger.error(`Realtime product fetch failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Apply filters to normalized products
	 */
	private applyFilters(products: any[], filters?: SearchFilters): any[] {
		if (!filters) return products;

		return products.filter((product) => {
			// Category filter
			if (filters.category && product.category !== filters.category) {
				return false;
			}

			// Brand filter
			if (
				filters.brand &&
				product.brand?.toLowerCase() !== filters.brand.toLowerCase()
			) {
				return false;
			}

			// Price filters
			if (
				filters.minPrice &&
				(!product.price || product.price < filters.minPrice)
			) {
				return false;
			}
			if (
				filters.maxPrice &&
				(!product.price || product.price > filters.maxPrice)
			) {
				return false;
			}

			// Rating filter
			if (
				filters.minRating &&
				(!product.rating || product.rating < filters.minRating)
			) {
				return false;
			}

			// Review count filter
			if (
				filters.minReviewCount &&
				(!product.reviewCount || product.reviewCount < filters.minReviewCount)
			) {
				return false;
			}

			// Availability filter
			if (
				filters.available !== undefined &&
				product.available !== filters.available
			) {
				return false;
			}

			// Fulfillment filter (e.g., Prime)
			if (filters.fulfillment && product.fulfillment !== filters.fulfillment) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Check if Apify service is available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			return await this.apifyClient.healthCheck();
		} catch (error) {
			return false;
		}
	}
}
