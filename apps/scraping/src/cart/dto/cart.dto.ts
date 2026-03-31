import { Type } from 'class-transformer';
import {
	IsInt,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	MaxLength,
	Min,
} from 'class-validator';

export class AddCartItemDto {
	@IsString()
	product_id: string;

	@IsString()
	@MaxLength(500)
	name: string;

	@IsOptional()
	@IsString()
	image?: string;

	@IsOptional()
	@IsString()
	size?: string;

	@IsOptional()
	@IsString()
	color?: string;

	@IsNumber()
	@IsPositive()
	price: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	quantity?: number;

	@IsOptional()
	@IsString()
	retailer?: string;

	@IsOptional()
	@IsString()
	product_url?: string;
}

export class UpdateCartItemDto {
	@IsInt()
	@Min(0)
	@Type(() => Number)
	quantity: number;
}
