import { Injectable, Logger } from '@nestjs/common';
import { BrowserUse } from 'browser-use-sdk';
import { BrowserUseSearchResponse, SearchFilters } from '../common/interfaces';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class BrowserUseClientService {
	private readonly logger = new Logger(BrowserUseClientService.name);
	private readonly client: BrowserUse;

	constructor(private readonly config: AppConfigService) {
		this.client = new BrowserUse({
			apiKey: this.config.browserUseApiKey,
		});
	}

	/**
	 * Search Amazon via Browser Use SDK
	 */
	async searchAmazon(
		query: string,
		filters?: SearchFilters,
		options?: {
			maxResults?: number;
			page?: number;
			filters?: any;
		},
	): Promise<BrowserUseSearchResponse> {
		try {
			this.logger.log(`Browser Use search request: ${query}`);

			const maxResults = options?.maxResults || 20;
			const searchUrl = `https://www.amazon.com/`;

			const result = await this.client.run(
				`Search for the top ${maxResults} ${query} products on Amazon. Return the results as a JSON array of objects, where each object has the following fields: title (string), price (number), originalPrice (number, if on sale), rating (number out of 5), reviewCount (number), asin (string), imageUrl (string), productUrl (string), category (string), brand (string), availability (boolean). Do not include any other text, just the JSON array.`,
			);

			// Parse the result - it should be a string that we can parse as JSON
			let products = [];
			try {
				products = typeof result === 'string' ? JSON.parse(result) : result;
				if (!Array.isArray(products)) {
					products = [];
				}
			} catch (parseError) {
				this.logger.warn(
					`Failed to parse Browser Use response: ${parseError.message}`,
				);
				products = [];
			}

			this.logger.log(`Browser Use search completed: ${products.length} results`);

			return {
				success: true,
				data: products,
				timestamp: new Date().toISOString(),
				source: 'browser-use',
			};
		} catch (error) {
			this.logger.error(
				`Browser Use search failed: ${error.message}`,
				error.stack,
			);
			throw new Error(`Browser Use search failed: ${error.message}`);
		}
	}

	/**
	 * Get product details by ASIN via Browser Use SDK
	 */
	async getProductByAsin(asin: string): Promise<any> {
		try {
			this.logger.log(`Browser Use product request: ${asin}`);

			const result = await this.client.run(
				`Go to https://www.amazon.com/dp/${asin} and extract all product details including: full product title, current price and original price (if on sale), rating (out of 5), total number of reviews, detailed product description, bullet points/key features, all product images URLs, availability status, seller name, shipping information, and any product variants/options available. Return as structured JSON.`,
			);

			// Parse the result
			let productData;
			try {
				productData = typeof result === 'string' ? JSON.parse(result) : result;
			} catch (parseError) {
				this.logger.warn(`Failed to parse product data: ${parseError.message}`);
				productData = { raw: result };
			}

			return productData;
		} catch (error) {
			this.logger.error(`Browser Use product fetch failed: ${error.message}`);
			throw new Error(`Browser Use product fetch failed: ${error.message}`);
		}
	}

	/**
	 * Check Browser Use Cloud API health
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.billing.account();
			return true;
		} catch (error) {
			this.logger.warn(`Browser Use health check failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Get Browser Use Cloud API stats
	 */
	async getStats(): Promise<any> {
		try {
			const accountInfo = await this.client.billing.account();
			return accountInfo;
		} catch (error) {
			this.logger.warn(`Browser Use stats fetch failed: ${error.message}`);
			return null;
		}
	}
}
