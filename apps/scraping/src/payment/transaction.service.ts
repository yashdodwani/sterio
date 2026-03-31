import { ApiResponse } from '@/common/dto/response.dto';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { RedisService } from '../common/redis.service';
import { TransactionEntity, TransactionStatus } from '../database/entities';
import { ScanService } from '../paywall/scan.service';
import { VerifyTransactionDto, VerifyTransactionRequestDto } from './dto';

@Injectable()
export class TransactionService {
	private readonly logger = new Logger(TransactionService.name);

	constructor(
		@InjectRepository(TransactionEntity)
		private readonly transactionRepo: Repository<TransactionEntity>,
		private readonly scanService: ScanService,
		private readonly redisService: RedisService,
		private readonly httpService: HttpService,
		private readonly configService: AppConfigService,
	) {}

	async verifyTransaction(
		request: VerifyTransactionRequestDto,
	): Promise<ApiResponse<VerifyTransactionDto>> {
		const { txHash, userId } = request;
		const lockKey = `lock:tx_verify:${txHash}`;
		let lockValue: string | null = null;

		try {
			// Acquire distributed lock to prevent race conditions
			lockValue = await this.redisService.acquireLock(lockKey, 60); // 60 seconds lock
			if (!lockValue) {
				return ApiResponse.error(
					429,
					'Transaction verification is already in progress, please retry later',
				);
			}

			const transaction = await this.transactionRepo.findOne({
				where: { txHash },
			});

			if (transaction) {
				return ApiResponse.error(
					400,
					`Transaction already processed with status: ${transaction.status}`,
				);
			}

			// Transaction doesn't exist, create and process it
			const newTransaction = this.transactionRepo.create({
				txHash,
				userId,
				status: 'PENDING', 
			});

			return await this.processTransaction(txHash, userId, newTransaction);
		} catch (error) {
			this.logger.error(
				`Transaction verification failed: ${error.message}`,
				error.stack,
			);
			return ApiResponse.error(500, error.message || 'Internal server error');
		} finally {
			if (lockValue) {
				await this.redisService.releaseLock(lockKey, lockValue);
			}
		}
	}


	private async processTransaction(
		txHash: string,
		userId: string,
		transaction: TransactionEntity,
	): Promise<ApiResponse<VerifyTransactionDto>> {
		try {
			// Get transaction details from blockchain
			const txDetails = await this.scanService.getTransactionDetail(txHash);

			if (!txDetails) {
				await this.updateTransactionStatus(
					transaction,
					'FAILED',
					'Transaction not found',
				);
				return ApiResponse.error(404, 'Transaction not found on blockchain');
			}

			// // Validate transaction
			// const validationResult = await this.validateTransaction(txDetails, userId);

			// if (!validationResult.isValid) {
			// 	await this.updateTransactionStatus(
			// 		transaction,
			// 		'FAILED',
			// 		validationResult.error,
			// 	);
			// 	return ApiResponse.error(500, validationResult.error);
			// }

			transaction.receiver = txDetails.to;
			transaction.originAmount = txDetails.value;
			transaction.amount = parseFloat(txDetails.amount);
			transaction.status = 'SUCCESS';
			await this.transactionRepo.save(transaction);
			console.log('Transaction verified and saved:', transaction);

			// Call downstream service (idempotent)
			await this.callDownstreamService({
				userId,
				address: txDetails.to,
				amountPAS: txDetails.value,
				txHash,
			});

			return ApiResponse.success(
				{
					receiver: txDetails.to,
					amount: parseFloat(txDetails.value),
					userId,
				},
				200,
				'Transaction verified successfully',
			);
		} catch (error) {
			await this.updateTransactionStatus(transaction, 'FAILED', error.message);
			return ApiResponse.error(
				500,
				error.message || 'Transaction processing failed',
			);
		}
	}

	private async validateTransaction(
		txDetails: any,
		userId: string,
	): Promise<{ isValid: boolean; error?: string }> {
		// Check if transaction exists and is confirmed
		if (!txDetails || !txDetails.blockNumber) {
			return { isValid: false, error: 'Transaction not confirmed' };
		}

		// Check amount is positive
		if (!txDetails.value || parseFloat(txDetails.value) <= 0) {
			return { isValid: false, error: 'Invalid transaction amount' };
		}

		return { isValid: true };
	}

	private async updateTransactionStatus(
		transaction: TransactionEntity,
		status: TransactionStatus,
		errorMsg?: string,
	): Promise<void> {
		transaction.status = status;
		if (errorMsg) {
			transaction.errorMsg = errorMsg;
		}
		await this.transactionRepo.save(transaction);
	}

	private async callDownstreamService(data: {
		userId: string;
		address: string;
		amountPAS: string;
		txHash: string;
	}): Promise<void> {
		try {
			// Use txHash as idempotency key for downstream service
			const idempotencyKey = `downstream:${data.txHash}`;

			// Check if already processed
			const alreadyProcessed = await this.redisService.exists(idempotencyKey);
			if (alreadyProcessed) {
				this.logger.log(
					`Downstream service already called for txHash: ${data.txHash}`,
				);
				return;
			}

			const baseUrl = this.configService.comagentBaseUrl;
			const webhookSecret = this.configService.depositWebhookSecret;
			const url = `${baseUrl}/api/deposit/${data.userId}/${data.address}/confirm`;

			const response = await firstValueFrom(
				this.httpService.post(
					url,
					{
						amountPAS: parseInt(data.amountPAS),
						transactionHash: data.txHash,
					},
					{
						headers: {
							'Content-Type': 'application/json',
							'X-Webhook-Secret': webhookSecret,
						},
					},
				),
			);

			// Mark as processed
			await this.redisService.set(idempotencyKey, 'processed', 86400); // 24 hours

			this.logger.log(
				`Deposit webhook called successfully for txHash: ${data.txHash}, response: ${JSON.stringify(response.data)}`,
			);
		} catch (error) {
			this.logger.error(
				`Deposit webhook call failed: ${error.message}`,
				error.stack,
			);
		}
	}
}
