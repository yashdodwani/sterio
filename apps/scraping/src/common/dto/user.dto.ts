import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UserPreferencesDto {
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	favoriteCategories?: string[];

	@IsOptional()
	@IsObject()
	priceRange?: {
		min: number;
		max: number;
	};

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	preferredBrands?: string[];

	@IsOptional()
	@IsObject()
	notifications?: {
		priceAlerts: boolean;
		recommendations: boolean;
	};
}

export class UserProfileResponseDto {
	userId: string;
	preferences: Record<string, any>;
	favoriteCategories: string[];
	searchHistory: string[];
	createdAt: Date;
	updatedAt: Date;
}

export class RecordInteractionDto {
	@IsString()
	asin: string;

	@IsString()
	interactionType: 'view' | 'click' | 'purchase' | 'favorite' | 'search';

	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>;
}
