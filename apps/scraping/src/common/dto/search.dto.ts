import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

export class SearchQueryDto extends PaginationQueryDto {
	@IsString()
	q: string;

	@IsOptional()
	@IsString()
	category?: string;

	@IsOptional()
	@IsString()
	brand?: string;

	@IsOptional()
	@IsString()
	color?: string;

	@IsOptional()
	@IsString()
	size?: string;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@Min(0)
	minPrice?: number;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@Min(0)
	maxPrice?: number;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@Min(0)
	@Max(5)
	minRating?: number;

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	forceRealtime?: boolean;
}

export class AiQueryDto {
	@IsString()
	query: string;

	@IsOptional()
	@IsString()
	userId?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	context?: string[];
}

export class TrackProductDto {
	@IsString()
	asin: string;

	@IsOptional()
	@IsString()
	userId?: string;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	targetPrice?: number;
}
