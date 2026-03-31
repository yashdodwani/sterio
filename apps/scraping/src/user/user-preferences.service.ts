import { UserProfileEntity, UserInteractionEntity } from '@/database/entities';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface UserPreferences {
	favoriteCategories: string[];
	priceRange: {
		min: number;
		max: number;
	};
	preferredBrands: string[];
	notifications: {
		priceAlerts: boolean;
		recommendations: boolean;
	};
}

export interface UpdatePreferencesDto {
	favoriteCategories?: string[];
	priceRange?: {
		min: number;
		max: number;
	};
	preferredBrands?: string[];
	notifications?: {
		priceAlerts: boolean;
		recommendations: boolean;
	};
}

@Injectable()
export class UserService {
	private readonly logger = new Logger(UserService.name);

	constructor(
		@InjectRepository(UserProfileEntity)
		private readonly userProfileRepo: Repository<UserProfileEntity>,
		@InjectRepository(UserInteractionEntity)
		private readonly userInteractionRepo: Repository<UserInteractionEntity>,
	) {}

	async getUserProfile(userId: string): Promise<UserProfileEntity> {
		let profile = await this.userProfileRepo.findOne({
			where: { userId },
		});

		if (!profile) {
			profile = this.userProfileRepo.create({
				userId,
				preferences: {},
				favoriteCategories: [],
				searchHistory: [],
			});
			profile = await this.userProfileRepo.save(profile);
		}

		return profile;
	}

	async updatePreferences(
		userId: string,
		dto: UpdatePreferencesDto,
	): Promise<UserProfileEntity> {
		let profile = await this.getUserProfile(userId);

		const updatedPreferences = {
			...profile.preferences,
			...dto,
		};

		profile.preferences = updatedPreferences;
		profile.updatedAt = new Date();

		const savedProfile = await this.userProfileRepo.save(profile);

		this.logger.log(`Updated preferences for user ${userId}`);

		return savedProfile;
	}

	async addToSearchHistory(userId: string, query: string): Promise<void> {
		const profile = await this.getUserProfile(userId);

		const searchHistory = profile.searchHistory || [];
		const updatedHistory = [
			query,
			...searchHistory.filter((q) => q !== query),
		].slice(0, 50); // Keep last 50 searches

		await this.userProfileRepo.update(
			{ userId },
			{ searchHistory: updatedHistory, updatedAt: new Date() },
		);
	}

	async addFavoriteCategory(userId: string, category: string): Promise<void> {
		const profile = await this.getUserProfile(userId);

		const favoriteCategories = profile.favoriteCategories || [];
		if (!favoriteCategories.includes(category)) {
			favoriteCategories.push(category);
			await this.userProfileRepo.update(
				{ userId },
				{ favoriteCategories, updatedAt: new Date() },
			);
		}
	}

	async removeFavoriteCategory(userId: string, category: string): Promise<void> {
		const profile = await this.getUserProfile(userId);

		const favoriteCategories = profile.favoriteCategories || [];
		const updatedCategories = favoriteCategories.filter((c) => c !== category);

		await this.userProfileRepo.update(
			{ userId },
			{ favoriteCategories: updatedCategories, updatedAt: new Date() },
		);
	}

	async recordInteraction(
		userId: string,
		asin: string,
		interactionType: UserInteractionEntity['interactionType'],
		metadata?: Record<string, any>,
	): Promise<void> {
		const interaction = this.userInteractionRepo.create({
			userId,
			asin,
			interactionType,
			metadata,
		});

		await this.userInteractionRepo.save(interaction);

		// Update search history if it's a search interaction
		if (interactionType === 'search' && metadata?.query) {
			await this.addToSearchHistory(userId, metadata.query);
		}
	}

	async getUserInteractions(
		userId: string,
		limit: number = 50,
	): Promise<UserInteractionEntity[]> {
		return this.userInteractionRepo.find({
			where: { userId },
			order: { timestamp: 'DESC' },
			take: limit,
		});
	}

	async getPersonalizedRecommendations(userId: string): Promise<string[]> {
		const interactions = await this.getUserInteractions(userId, 100);

		// Simple recommendation logic based on interaction history
		const viewedAsins = interactions
			.filter((i) => i.interactionType === 'view')
			.map((i) => i.asin);

		const favoritedAsins = interactions
			.filter((i) => i.interactionType === 'favorite')
			.map((i) => i.asin);

		// In a real implementation, you would use more sophisticated algorithms
		// For now, return recently viewed items as recommendations
		return [...new Set([...favoritedAsins, ...viewedAsins])].slice(0, 10);
	}
}
