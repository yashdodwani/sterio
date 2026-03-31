import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
} from '@nestjs/common';
import { ApiResponse } from '../common/dto/response.dto';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@Controller('chat')
// @RequirePayment()
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	/**
	 * POST /api/chat
	 * Send a message and receive AI response
	 */
	@Post()
	async sendMessage(@Body() dto: SendMessageDto): Promise<ApiResponse<any>> {
		const result = await this.chatService.sendMessage(dto);
		return ApiResponse.success(result, 200, 'Message sent successfully');
	}

	/**
	 * GET /api/chat/history?session_id=...
	 */
	@Get('history')
	async getHistory(
		@Query('session_id', ParseUUIDPipe) sessionId: string,
	): Promise<ApiResponse<any>> {
		const result = await this.chatService.getHistory(sessionId);
		return ApiResponse.success(
			result,
			200,
			'Chat history retrieved successfully',
		);
	}

	/**
	 * DELETE /api/chat/:session_id
	 */
	@Delete(':session_id')
	@HttpCode(HttpStatus.OK)
	async deleteSession(
		@Param('session_id', ParseUUIDPipe) sessionId: string,
	): Promise<ApiResponse<null>> {
		await this.chatService.deleteSession(sessionId);
		return ApiResponse.success(null, 200, 'Chat session deleted successfully');
	}
}
