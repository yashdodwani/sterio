import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, SearchResponseDto } from '../common/dto/response.dto';
import { SearchQueryDto } from '../common/dto/search.dto';
import { HybridOrchestratorService } from './hybrid-orchestrator.service';

@Controller('search')
export class HybridOrchestratorController {
	constructor(private readonly orchestrator: HybridOrchestratorService) {}

	/**
	 * Main search endpoint with smart routing
	 */
	@Get()
	async search(
		@Query() query: SearchQueryDto,
	): Promise<ApiResponse<SearchResponseDto>> {
		const filters = {
			category: query.category,
			brand: query.brand,
			minPrice: query.minPrice,
			maxPrice: query.maxPrice,
			minRating: query.minRating,
		};

		const result = await this.orchestrator.search(
			query.q,
			filters,
			query.page,
			query.limit,
			query.forceRealtime,
		);

		return ApiResponse.success(result, 200, 'Search completed successfully');
	}

	/**
	 * Get system status
	 */
	@Get('status')
	async getStatus(): Promise<ApiResponse<any>> {
		const status = await this.orchestrator.getStatus();

		return ApiResponse.success(
			{ data: status, timestamp: new Date().toISOString() },
			200,
			'System status retrieved successfully',
		);
	}

	/**
	 * Get popular queries
	 */
	@Get('popular')
	async getPopularQueries(
		@Query('limit') limit?: number,
	): Promise<ApiResponse<any>> {
		const popular = this.orchestrator.getPopularQueries(
			limit ? Number(limit) : 10,
		);

		return ApiResponse.success(
			{ data: popular },
			200,
			'Popular queries retrieved successfully',
		);
	}
}
