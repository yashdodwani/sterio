import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { NormalizedProduct } from '../common/interfaces';
import { AppConfigService } from '../config/app-config.service';
import {
	ChatMessage,
	ChatSessionEntity,
} from '../database/entities/chat-session.entity';
import { HybridOrchestratorService } from '../orchestrator/hybrid-orchestrator.service';
import { ChatResponse, ProductCard, SendMessageDto } from './dto/chat.dto';

/** Parsed args from the search_products tool call */
interface SearchToolArgs {
	query: string;
	category?: string;
	minPrice?: number;
	maxPrice?: number;
	brand?: string;
	minRating?: number;
}

@Injectable()
export class ChatService {
	private readonly logger = new Logger(ChatService.name);
	private readonly openai: OpenAI;

	private readonly SYSTEM_PROMPT = `You are a helpful AI shopping assistant. Your goal is to help users find the perfect product through conversation.

When a user describes what they want:
1. If you need more clarity (type, size, budget, gender, brand, etc.), ask ONE focused clarifying question at a time.
2. When you have enough information, call the search_products tool to find matching products.
3. After receiving search results, present the best 3-5 products in a friendly summary.

Keep responses concise and focused. Do not ask multiple questions at once.`;

	private readonly TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
		{
			type: 'function',
			function: {
				name: 'search_products',
				description:
					"Search the product catalog for items matching the user's requirements.",
				parameters: {
					type: 'object',
					properties: {
						query: {
							type: 'string',
							description: 'The main search query string',
						},
						category: {
							type: 'string',
							description: 'Product category (e.g. shoes, electronics)',
						},
						minPrice: {
							type: 'number',
							description: 'Minimum price in USD',
						},
						maxPrice: {
							type: 'number',
							description: 'Maximum price in USD',
						},
						brand: {
							type: 'string',
							description: 'Preferred brand name',
						},
						minRating: {
							type: 'number',
							description: 'Minimum product rating (1-5)',
						},
					},
					required: ['query'],
				},
			},
		},
	];

	constructor(
		@InjectRepository(ChatSessionEntity)
		private readonly sessionRepo: Repository<ChatSessionEntity>,
		private readonly orchestrator: HybridOrchestratorService,
		private readonly config: AppConfigService,
	) {
		this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
	}

	async sendMessage(dto: SendMessageDto): Promise<ChatResponse> {
		// Load or create session
		let session: ChatSessionEntity;
		if (dto.session_id) {
			session = await this.sessionRepo.findOne({
				where: { id: dto.session_id, active: true },
			});
			if (!session) {
				throw new NotFoundException(`Session ${dto.session_id} not found`);
			}
		} else {
			session = this.sessionRepo.create({
				userId: dto.user_id ?? null,
				messages: [],
				active: true,
			});
			session = await this.sessionRepo.save(session);
		}

		// Append user message
		const userMsg: ChatMessage = {
			role: 'user',
			content: dto.message,
			timestamp: new Date().toISOString(),
		};
		session.messages = [...session.messages, userMsg];

		// Build OpenAI messages (exclude our custom 'timestamp' field)
		const openaiMessages = this.buildOpenAIMessages(session.messages);

		// First AI call
		let completion = await this.openai.chat.completions.create({
			model: this.config.openaiModel,
			messages: openaiMessages,
			tools: this.TOOLS,
			tool_choice: 'auto',
		});

		let assistantMessage = completion.choices[0].message;

		// Handle tool calls (product search)
		let productsFound: NormalizedProduct[] = [];
		while (
			assistantMessage.tool_calls &&
			assistantMessage.tool_calls.length > 0
		) {
			// Save assistant tool-call message
			const assistantRawMsg: ChatMessage = {
				role: 'assistant',
				content: assistantMessage.content ?? '',
				timestamp: new Date().toISOString(),
			};
			session.messages = [...session.messages, assistantRawMsg];

			// Process each tool call
			for (const toolCall of assistantMessage.tool_calls) {
				if (toolCall.function.name === 'search_products') {
					const args = JSON.parse(toolCall.function.arguments) as SearchToolArgs;
					this.logger.log(`Searching products: ${JSON.stringify(args)}`);

					try {
						const result = await this.orchestrator.search(
							args.query,
							{
								category: args.category,
								brand: args.brand,
								minPrice: args.minPrice,
								maxPrice: args.maxPrice,
								minRating: args.minRating,
							},
							1,
							10,
						);
						productsFound = result.products;

						// Store intent
						session.lastIntent = args as Record<string, any>;

						const toolResultMsg: ChatMessage = {
							role: 'tool',
							toolCallId: toolCall.id,
							toolName: toolCall.function.name,
							content: JSON.stringify({
								count: result.products.length,
								products: result.products.slice(0, 10).map((p) => ({
									asin: p.asin,
									title: p.title,
									price: p.price,
									rating: p.rating,
									brand: p.brand,
									available: p.available,
									productUrl: p.productUrl,
									images: p.images?.slice(0, 1),
								})),
							}),
							timestamp: new Date().toISOString(),
						};
						session.messages = [...session.messages, toolResultMsg];
					} catch (err) {
						this.logger.error(`Search tool error: ${err.message}`);
						const errorMsg: ChatMessage = {
							role: 'tool',
							toolCallId: toolCall.id,
							toolName: toolCall.function.name,
							content: JSON.stringify({
								error: 'Search failed',
								count: 0,
								products: [],
							}),
							timestamp: new Date().toISOString(),
						};
						session.messages = [...session.messages, errorMsg];
					}
				}
			}

			// Second AI call with tool results
			completion = await this.openai.chat.completions.create({
				model: this.config.openaiModel,
				messages: this.buildOpenAIMessages(session.messages),
				tools: this.TOOLS,
				tool_choice: 'auto',
			});
			assistantMessage = completion.choices[0].message;
		}

		// Save final assistant reply
		const finalMsg: ChatMessage = {
			role: 'assistant',
			content: assistantMessage.content ?? '',
			timestamp: new Date().toISOString(),
		};
		session.messages = [...session.messages, finalMsg];
		await this.sessionRepo.save(session);

		// Determine response type
		if (productsFound.length > 0) {
			return {
				session_id: session.id,
				type: 'ai_products',
				message: assistantMessage.content ?? undefined,
				products: productsFound.slice(0, 5).map((p) => this.toProductCard(p)),
			};
		}

		// Detect if the AI is asking a question
		const content = assistantMessage.content ?? '';
		const isQuestion = content.trim().endsWith('?');

		return {
			session_id: session.id,
			type: isQuestion ? 'ai_question' : 'ai_message',
			message: content,
		};
	}

	async getHistory(sessionId: string): Promise<{
		session_id: string;
		messages: ChatMessage[];
	}> {
		const session = await this.sessionRepo.findOne({
			where: { id: sessionId },
		});
		if (!session) {
			throw new NotFoundException(`Session ${sessionId} not found`);
		}
		return {
			session_id: session.id,
			messages: session.messages.filter(
				(m) => m.role === 'user' || m.role === 'assistant',
			),
		};
	}

	async deleteSession(sessionId: string): Promise<void> {
		const session = await this.sessionRepo.findOne({
			where: { id: sessionId },
		});
		if (!session) {
			throw new NotFoundException(`Session ${sessionId} not found`);
		}
		session.active = false;
		await this.sessionRepo.save(session);
	}

	private buildOpenAIMessages(
		messages: ChatMessage[],
	): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
		const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
			{ role: 'system', content: this.SYSTEM_PROMPT },
		];

		for (const msg of messages) {
			if (msg.role === 'user') {
				result.push({ role: 'user', content: msg.content });
			} else if (msg.role === 'assistant') {
				result.push({ role: 'assistant', content: msg.content });
			} else if (msg.role === 'tool' && msg.toolCallId) {
				result.push({
					role: 'tool',
					tool_call_id: msg.toolCallId,
					content: msg.content,
				});
			}
		}

		return result;
	}

	private toProductCard(p: NormalizedProduct): ProductCard {
		return {
			id: p.asin,
			name: p.title,
			image: p.images?.[0] ?? '',
			price: p.price ?? 0,
			currency: 'USD',
			sizes: [],
			colors: [],
			retailer: p.seller ?? 'Amazon',
			product_url: p.productUrl,
			rating: p.rating,
			reviewCount: p.reviewCount,
		};
	}
}
