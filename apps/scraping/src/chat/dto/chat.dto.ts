import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
	@IsOptional()
	@IsUUID()
	session_id?: string;

	@IsString()
	@MaxLength(2000)
	message: string;

	@IsOptional()
	@IsString()
	user_id?: string;
}

export class ChatHistoryQueryDto {
	@IsUUID()
	session_id: string;
}

export interface ProductCard {
	id: string;
	name: string;
	image: string;
	price: number;
	currency: 'USD';
	sizes: string[];
	colors: ColorOption[];
	retailer: string;
	product_url: string;
	rating?: number;
	reviewCount?: number;
}

export interface ColorOption {
	name: string;
	hex: string;
}

export interface ChatResponse {
	session_id: string;
	type: 'ai_question' | 'ai_products' | 'ai_message' | 'system';
	message?: string;
	products?: ProductCard[];
}
