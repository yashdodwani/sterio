import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	Request,
} from '@nestjs/common';
import { ApiResponse } from '../common/dto/response.dto';
import {
	RecordInteractionDto,
	UserPreferencesDto,
	UserProfileResponseDto,
} from '../common/dto/user.dto';
import { UserService } from './user-preferences.service';

@Controller('users')
export class UserController {
	constructor(private readonly UserService: UserService) {}

	@Get('profile')
	async getProfile(
		@Request() req: any,
	): Promise<ApiResponse<UserProfileResponseDto>> {
		const userId = req.user?.id || 'anonymous';
		const profile = await this.UserService.getUserProfile(userId);

		const response: UserProfileResponseDto = {
			userId: profile.userId,
			preferences: profile.preferences,
			favoriteCategories: profile.favoriteCategories,
			searchHistory: profile.searchHistory,
			createdAt: profile.createdAt,
			updatedAt: profile.updatedAt,
		};

		return ApiResponse.success(
			response,
			200,
			'User profile retrieved successfully',
		);
	}

	@Put('preferences')
	async updatePreferences(
		@Body() dto: UserPreferencesDto,
		@Request() req: any,
	): Promise<ApiResponse<UserProfileResponseDto>> {
		const userId = req.user?.id || 'anonymous';
		const profile = await this.UserService.updatePreferences(userId, dto);

		const response: UserProfileResponseDto = {
			userId: profile.userId,
			preferences: profile.preferences,
			favoriteCategories: profile.favoriteCategories,
			searchHistory: profile.searchHistory,
			createdAt: profile.createdAt,
			updatedAt: profile.updatedAt,
		};

		return ApiResponse.success(
			response,
			200,
			'User preferences updated successfully',
		);
	}

	@Post('favorites/:category')
	async addFavoriteCategory(
		@Param('category') category: string,
		@Request() req: any,
	): Promise<ApiResponse<null>> {
		const userId = req.user?.id || 'anonymous';
		await this.UserService.addFavoriteCategory(userId, category);
		return ApiResponse.success(null, 200, 'Favorite category added successfully');
	}

	@Post('interactions')
	async recordInteraction(
		@Body() dto: RecordInteractionDto,
		@Request() req: any,
	): Promise<ApiResponse<null>> {
		const userId = req.user?.id || 'anonymous';
		await this.UserService.recordInteraction(
			userId,
			dto.asin,
			dto.interactionType,
			dto.metadata,
		);
		return ApiResponse.success(null, 200, 'Interaction recorded successfully');
	}

	@Get('recommendations')
	async getRecommendations(
		@Request() req: any,
	): Promise<ApiResponse<{ recommendations: string[] }>> {
		const userId = req.user?.id || 'anonymous';
		const recommendations =
			await this.UserService.getPersonalizedRecommendations(userId);

		return ApiResponse.success(
			{ recommendations },
			200,
			'Recommendations retrieved successfully',
		);
	}
}
