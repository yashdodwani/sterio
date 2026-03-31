import { Controller, Get, Param, Query } from '@nestjs/common';
import { AdvancedSearchDto } from '../common/dto/advanced-search.dto';
import { ApiResponse, SearchResponseDto } from '../common/dto/response.dto';
import { CachedSearchService } from './cached-search.service';

@Controller('search/cached')
export class CachedSearchController {
	constructor(private readonly cachedSearch: CachedSearchService) {}

	@Get()
	async search(
		@Query() query: AdvancedSearchDto,
	): Promise<ApiResponse<SearchResponseDto>> {
		const filters = {
			category: query.category,
			brand: query.brand,
			minPrice: query.minPrice,
			maxPrice: query.maxPrice,
			minRating: query.minRating,
			brands: query.brands,
			categories: query.categories,
			freeShipping: query.freeShipping,
			prime: query.prime,
			onSale: query.onSale,
			maxRating: query.maxRating,
			features: query.features,
			condition: query.condition,
			sortBy: query.sortBy,
		};

		const result = await this.cachedSearch.search(
			query.q,
			filters,
			query.page,
			query.limit,
		);

		return ApiResponse.success(result, 200, 'Search completed successfully');
	}

	@Get('product/:asin')
	async getProduct(@Param('asin') asin: string): Promise<ApiResponse<any>> {
		const product = await this.cachedSearch.getProductByAsin(asin);

		return ApiResponse.success(
			{ data: product, source: 'cached' },
			200,
			'Product retrieved successfully',
		);
	}

	@Get('health')
	async health(): Promise<ApiResponse<any>> {
		const available = await this.cachedSearch.isAvailable();

		const healthData = {
			status: available ? 'healthy' : 'unavailable',
			service: 'cached-search',
			timestamp: new Date().toISOString(),
		};

		return ApiResponse.success(healthData, 200, 'Health check completed');
	}

	@Get('stats')
	async stats(): Promise<ApiResponse<any>> {
		const stats = await this.cachedSearch.getStats();

		return ApiResponse.success(
			{ data: stats },
			200,
			'Stats retrieved successfully',
		);
	}
}
