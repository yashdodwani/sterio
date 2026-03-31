import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@Min(1)
	@Max(100)
	limit?: number = 20;
}

export class PaginationResponseDto {
	@IsNumber()
	page: number;

	@IsNumber()
	limit: number;

	@IsNumber()
	total: number;

	@IsNumber()
	totalPage: number;
}
