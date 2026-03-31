import { SearchFilters } from '@/common/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { ApifyClient } from 'apify-client';
import { AppConfigService } from '../config/app-config.service';

interface ApifyDatasetItem {
	title: string;
	price: number;
	originalPrice?: number;
	rating?: number;
	reviewCount?: number;
	asin: string;
	imageUrl: string;
	productUrl: string;
	category?: string;
	brand?: string;
	availability: boolean;
	// other fields from Apify
}

interface ApifySearchInput {
	keyword: string;
	marketplaces: string[];
	maxProductResults: number;
	countryCode: string;
	scrapeMode: string;
	additionalProperties: boolean;
	additionalPropertiesSearchEngine: boolean;
	additionalReviewProperties: boolean;
	scrapeInfluencerProducts: boolean;
	scrapeReviewsDelivery: boolean;
	sortReview: string;
}

@Injectable()
export class ApifyClientService {
	private readonly logger = new Logger(ApifyClientService.name);
	private readonly actorId = 'apify/e-commerce-scraping-tool';
	private readonly client: ApifyClient;

	constructor(private readonly config: AppConfigService) {
		this.client = new ApifyClient({
			token: this.config.apifyApiToken,
		});
	}

	/**
	 * Search Amazon via Apify e-commerce scraping tool
	 */
	async searchAmazon(
		query: string,
		filters: SearchFilters,
		options?: {
			limit?: number;
			page?: number;
		},
	): Promise<{
		success: boolean;
		data: {
			items: any[];
			total?: number;
		};
		timestamp: string;
		source: string;
	}> {
		try {
			const { limit = 20, page = 1 } = options || {};
			const queryWithFilters = this.buildQueryWithFilters(query, filters);
			console.log('Final query for Apify:', queryWithFilters);
			// Prepare input for Apify actor
			const input: ApifySearchInput = {
				keyword: queryWithFilters,
				marketplaces: ['www.amazon.com'],
				maxProductResults: limit,
				countryCode: 'vn',
				scrapeMode: 'AUTO',
				additionalProperties: true,
				additionalPropertiesSearchEngine: true,
				additionalReviewProperties: true,
				scrapeInfluencerProducts: false,
				scrapeReviewsDelivery: false,
				sortReview: 'Most recent',
			};

			// Start the actor run and wait for completion
			const run = await this.client.actor(this.actorId).call(input);

			// Get dataset items directly (SDK handles waiting)
			const dataset = await this.client.dataset(run.defaultDatasetId || run.id);
			const results = await dataset.listItems();

			this.logger.log(`Apify search completed: ${results.items.length} results`);

			return {
				success: true,
				data: results,
				timestamp: new Date().toISOString(),
				source: 'apify',
			};
		} catch (error) {
			this.logger.error(`Apify search failed: ${error.message}`, error.stack);
			throw new Error(`Apify search failed: ${error.message}`);
		}
	}

	buildQueryWithFilters(query: string, filters: SearchFilters): string {
		let modifiedQuery = query;

		// Add category filter to query
		if (filters.category) {
			modifiedQuery += ` in category ${filters.category}`;
		}

		if (filters.brand) {
			modifiedQuery += ` from brand ${filters.brand}`;
		}

		if (filters.color) {
			modifiedQuery += ` with color ${filters.color}`;
		}

		if (filters.size) {
			modifiedQuery += ` with size ${filters.size}`;
		}

		// Add price range filter to query
		if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
			modifiedQuery += ` with offer price in range ${filters.minPrice}$ and ${filters.maxPrice}$`;
		} else if (filters.minPrice !== undefined) {
			modifiedQuery += ` with offer price greater than ${filters.minPrice}$`;
		} else if (filters.maxPrice !== undefined) {
			modifiedQuery += ` with offer price less than ${filters.maxPrice}$`;
		}
		return modifiedQuery;
	}

	/**
	 * Get product details by ASIN via Apify
	 */
	async getProductByAsin(asin: string): Promise<any> {
		try {
			this.logger.log(`Apify product request: ${asin}`);
			const input: ApifySearchInput = {
				keyword: asin,
				marketplaces: ['www.amazon.com'],
				maxProductResults: 1,
				countryCode: 'vn',
				scrapeMode: 'AUTO',
				additionalProperties: true,
				additionalPropertiesSearchEngine: true,
				additionalReviewProperties: true,
				scrapeInfluencerProducts: false,
				scrapeReviewsDelivery: false,
				sortReview: 'Most recent',
			};

			// Start the actor run and wait for completion
			const run = await this.client.actor(this.actorId).call(input);

			this.logger.log(`Apify run started: ${run.id}`);

			// Get dataset items directly
			const dataset = await this.client.dataset(run.defaultDatasetId || run.id);
			const results = await dataset.listItems();

			if (results.items.length === 0) {
				throw new Error(`Product ${asin} not found`);
			}

			return results.items[0];
		} catch (error) {
			this.logger.error(`Apify product fetch failed: ${error.message}`);
			throw new Error(`Apify product fetch failed: ${error.message}`);
		}
	}

	/**
	 * Check Apify API health
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.user().get();
			return true;
		} catch (error) {
			this.logger.warn(`Apify health check failed: ${error.message}`);
			return false;
		}
	}
}
