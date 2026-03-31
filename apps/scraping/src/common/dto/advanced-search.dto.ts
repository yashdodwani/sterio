import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';
import { SearchQueryDto } from './search.dto';

export type SortOption =
	| 'price_asc'
	| 'price_desc'
	| 'rating'
	| 'newest'
	| 'popular'
	| 'relevance';

export class AdvancedSearchDto extends SearchQueryDto {
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Type(() => String)
	brands?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Type(() => String)
	categories?: string[];

	@IsOptional()
	@IsEnum([
		'price_asc',
		'price_desc',
		'rating',
		'newest',
		'popular',
		'relevance',
	])
	sortBy?: SortOption;

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	freeShipping?: boolean;

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	prime?: boolean;

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	onSale?: boolean;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@Min(0)
	@Max(5)
	maxRating?: number;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Type(() => String)
	features?: string[];

	@IsOptional()
	@IsString()
	condition?: 'new' | 'used' | 'refurbished';

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	saveSearch?: boolean;

	@IsOptional()
	@IsString()
	searchName?: string;
}
