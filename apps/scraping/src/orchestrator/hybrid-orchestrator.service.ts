import { Injectable, Logger } from '@nestjs/common';
import { SearchFilters, SearchResult } from '../common/interfaces';
import { RealtimeSearchService } from '../realtime-search/realtime-search.service';
import { CachedSearchService } from '../search/cached-search.service';

export interface RoutingDecision {
	mode: 'cached' | 'realtime' | 'hybrid';
	reason: string;
}

@Injectable()
export class HybridOrchestratorService {
	private readonly logger = new Logger(HybridOrchestratorService.name);

	// Popular queries cache (in-memory for simplicity)
	private popularQueries = new Map<string, number>();

	constructor(
		private readonly cachedSearch: CachedSearchService,
		private readonly realtimeSearch: RealtimeSearchService,
	) {}

	/**
	 * Hybrid search with smart routing
	 */
	async search(
		query: string,
		filters?: SearchFilters,
		page: number = 1,
		limit: number = 20,
		forceRealtime: boolean = false,
	): Promise<SearchResult> {
		try {
			// Track query popularity
			this.trackQuery(query);

			// Make routing decision
			const decision = await this.makeRoutingDecision(
				query,
				filters,
				forceRealtime,
			);

			this.logger.log(`Routing decision: ${decision.mode} - ${decision.reason}`);

			// Execute based on decision
			switch (decision.mode) {
				case 'cached':
					return await this.cachedSearch.search(query, filters, page, limit);

				case 'realtime':
					return await this.realtimeSearch.search(query, filters, page, limit);

				case 'hybrid':
					return await this.hybridSearch(query, filters, page, limit);

				default:
					return await this.realtimeSearch.search(query, filters, page, limit);
			}
		} catch (error) {
			this.logger.error(`Hybrid search failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Make intelligent routing decision
	 */
	private async makeRoutingDecision(
		query: string,
		filters?: SearchFilters,
		forceRealtime: boolean = false,
	): Promise<RoutingDecision> {
		// Force realtime if requested
		if (forceRealtime) {
			return {
				mode: 'realtime',
				reason: 'User requested realtime',
			};
		}

		// Check if query is popular
		const queryCount = this.popularQueries.get(query.toLowerCase()) || 0;
		if (queryCount > 10) {
			return {
				mode: 'cached',
				reason: 'Popular query (cached data available)',
			};
		}

		// Check if price filters are strict (needs fresh data)
		if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
			return {
				mode: 'realtime',
				reason: 'Strict price filters require fresh data',
			};
		}

		// Check if cached search is available
		const cachedAvailable = await this.cachedSearch.isAvailable();
		if (!cachedAvailable) {
			return {
				mode: 'realtime',
				reason: 'Cached search unavailable',
			};
		}

		// Check if realtime search is available
		const realtimeAvailable = await this.realtimeSearch.isAvailable();
		if (!realtimeAvailable) {
			return {
				mode: 'cached',
				reason: 'Realtime search unavailable',
			};
		}

		// For first-time queries with moderate popularity
		if (queryCount > 3) {
			return {
				mode: 'hybrid',
				reason: 'Moderate popularity - combining cached and realtime',
			};
		}

		// Default to realtime for MVP (fresh data priority)
		return {
			mode: 'realtime',
			reason: 'Default: fresh data for new query',
		};
	}

	/**
	 * Hybrid search: combine cached and realtime results
	 */
	private async hybridSearch(
		query: string,
		filters?: SearchFilters,
		page: number = 1,
		limit: number = 20,
	): Promise<SearchResult> {
		const startTime = Date.now();

		try {
			this.logger.log(`Executing hybrid search for: "${query}"`);

			// Execute both searches in parallel
			const [cachedResult, realtimeResult] = await Promise.allSettled([
				this.cachedSearch.search(query, filters, page, Math.ceil(limit / 2)),
				this.realtimeSearch.search(query, filters, page, Math.ceil(limit / 2)),
			]);

			const cachedProducts =
				cachedResult.status === 'fulfilled' ? cachedResult.value.products : [];
			const realtimeProducts =
				realtimeResult.status === 'fulfilled' ? realtimeResult.value.products : [];

			// Merge and deduplicate by ASIN
			const mergedProducts = this.mergeProducts(cachedProducts, realtimeProducts);

			// Limit results
			const finalProducts = mergedProducts.slice(0, limit);

			const executionTime = Date.now() - startTime;
			const total = mergedProducts.length;
			const totalPage = Math.ceil(total / limit);

			return {
				products: finalProducts,
				total,
				page,
				limit,
				totalPage,
				source: 'hybrid',
				query,
				executionTime,
			};
		} catch (error) {
			this.logger.error(`Hybrid search failed: ${error.message}`);

			// Fallback to realtime only
			return await this.realtimeSearch.search(query, filters, page, limit);
		}
	}

	/**
	 * Merge products from cached and realtime, prefer realtime for duplicates
	 */
	private mergeProducts(cached: any[], realtime: any[]): any[] {
		const productMap = new Map<string, any>();

		// Add cached products first
		for (const product of cached) {
			productMap.set(product.asin, product);
		}

		// Override with realtime products (fresher data)
		for (const product of realtime) {
			productMap.set(product.asin, product);
		}

		return Array.from(productMap.values());
	}

	/**
	 * Track query popularity
	 */
	private trackQuery(query: string) {
		const normalized = query.toLowerCase().trim();
		const count = this.popularQueries.get(normalized) || 0;
		this.popularQueries.set(normalized, count + 1);

		// Clean up if map gets too large
		if (this.popularQueries.size > 10000) {
			const entries = Array.from(this.popularQueries.entries());
			entries.sort((a, b) => b[1] - a[1]);

			// Keep top 5000
			this.popularQueries = new Map(entries.slice(0, 5000));
		}
	}

	/**
	 * Get popular queries
	 */
	getPopularQueries(
		limit: number = 10,
	): Array<{ query: string; count: number }> {
		const entries = Array.from(this.popularQueries.entries());
		entries.sort((a, b) => b[1] - a[1]);

		return entries.slice(0, limit).map(([query, count]) => ({ query, count }));
	}

	/**
	 * Get system status
	 */
	async getStatus(): Promise<any> {
		const [cachedAvailable, realtimeAvailable] = await Promise.all([
			this.cachedSearch.isAvailable(),
			this.realtimeSearch.isAvailable(),
		]);

		return {
			cached: cachedAvailable ? 'available' : 'unavailable',
			realtime: realtimeAvailable ? 'available' : 'unavailable',
			mode: this.determineCurrentMode(cachedAvailable, realtimeAvailable),
			popularQueriesTracked: this.popularQueries.size,
		};
	}

	/**
	 * Determine current operational mode
	 */
	private determineCurrentMode(
		cachedAvailable: boolean,
		realtimeAvailable: boolean,
	): string {
		if (cachedAvailable && realtimeAvailable) return 'hybrid';
		if (realtimeAvailable) return 'realtime-only';
		if (cachedAvailable) return 'cached-only';
		return 'degraded';
	}
}
