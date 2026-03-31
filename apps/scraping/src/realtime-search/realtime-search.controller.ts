import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiResponse, SearchResponseDto } from '../common/dto/response.dto';
import { SearchQueryDto } from '../common/dto/search.dto';
import { RealtimeSearchService } from './realtime-search.service';

@Controller('search/realtime')
// @RequirePayment()
export class RealtimeSearchController {
	constructor(private readonly realtimeSearch: RealtimeSearchService) {}

	@Get()
	async search(
		@Query() query: SearchQueryDto,
	): Promise<ApiResponse<SearchResponseDto>> {
		const filters = {
			category: query.category,
			brand: query.brand,
			color: query.color,
			size: query.size,
			minPrice: query.minPrice,
			maxPrice: query.maxPrice,
			minRating: query.minRating,
		};

		const result = await this.realtimeSearch.search(
			query.q,
			filters,
			query.page,
			query.limit,
		);

		return ApiResponse.success(
			result,
			200,
			'Realtime search completed successfully',
		);
	}

	@Get('product/:asin')
	async getProduct(@Param('asin') asin: string): Promise<ApiResponse<any>> {
		const product = await this.realtimeSearch.getProductByAsin(asin);

		return ApiResponse.success(
			{ data: product, source: 'realtime' },
			200,
			'Product retrieved successfully',
		);
	}

	@Get('health')
	async health(): Promise<ApiResponse<any>> {
		const available = await this.realtimeSearch.isAvailable();

		const healthData = {
			status: available ? 'healthy' : 'unavailable',
			service: 'realtime-search',
			timestamp: new Date().toISOString(),
		};

		return ApiResponse.success(healthData, 200, 'Health check completed');
	}
}
