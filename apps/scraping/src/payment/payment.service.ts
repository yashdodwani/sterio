import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { PaymentEntity } from '../database/entities/payment.entity';
import { OrderService } from '../order/order.service';
import { ScanService } from '../paywall/scan.service';
import {
	GeneratePaymentRequestDto,
	PaymentWebhookDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentService {
	private readonly logger = new Logger(PaymentService.name);

	/** Payment expires after 15 minutes */
	private readonly PAYMENT_TTL_MS = 15 * 60 * 1000;

	constructor(
		@InjectRepository(PaymentEntity)
		private readonly paymentRepo: Repository<PaymentEntity>,
		private readonly orderService: OrderService,
		private readonly config: AppConfigService,
		private readonly scanService: ScanService,
	) {}

	/**
	 * Generate a Polkadot payment request for an order.
	 */
	async generatePaymentRequest(dto: GeneratePaymentRequestDto): Promise<{
		payment_id: string;
		recipient: string;
		amount: string;
		token: string;
		network: string;
		expires_at: string;
	}> {
		const order = await this.orderService.getOrderById(dto.order_id);

		if (order.userId !== dto.user_id) {
			throw new BadRequestException('Order does not belong to this user');
		}

		if (order.status === 'paid') {
			throw new BadRequestException('Order is already paid');
		}

		if (order.status === 'failed' || order.status === 'refunded') {
			throw new BadRequestException(`Order status is ${order.status}`);
		}

		// Check if there is already a pending/processing payment for this order
		const existingPayment = await this.paymentRepo.findOne({
			where: { orderId: dto.order_id, status: 'pending' },
		});
		if (existingPayment && existingPayment.expiresAt > new Date()) {
			return {
				payment_id: existingPayment.id,
				recipient: existingPayment.recipientAddress,
				amount: String(existingPayment.amount),
				token: existingPayment.token,
				network: existingPayment.network,
				expires_at: existingPayment.expiresAt.toISOString(),
			};
		}

		const expiresAt = new Date(Date.now() + this.PAYMENT_TTL_MS);

		const payment = await this.paymentRepo.save(
			this.paymentRepo.create({
				orderId: dto.order_id,
				userId: dto.user_id,
				amount: order.amount,
				token: 'DOT',
				network: this.config.polkadotNetwork,
				recipientAddress: this.config.polkadotMerchantAddress,
				status: 'pending',
				expiresAt,
			}),
		);

		await this.orderService.updateOrderStatus(dto.order_id, 'payment_processing');

		return {
			payment_id: payment.id,
			recipient: payment.recipientAddress,
			amount: String(payment.amount),
			token: payment.token,
			network: payment.network,
			expires_at: expiresAt.toISOString(),
		};
	}

	/**
	 * Handle payment webhook from frontend after Polkadot extrinsic submission.
	 * Verifies the on-chain transaction before confirming the order.
	 */
	async handleWebhook(dto: PaymentWebhookDto): Promise<{
		success: boolean;
		message: string;
		order_id?: string;
	}> {
		const payment = await this.paymentRepo.findOne({
			where: { id: dto.payment_id },
		});
		if (!payment) {
			throw new NotFoundException(`Payment ${dto.payment_id} not found`);
		}

		if (payment.status === 'confirmed') {
			return {
				success: true,
				message: 'Payment already confirmed',
				order_id: payment.orderId,
			};
		}

		if (payment.status === 'failed' || payment.status === 'expired') {
			throw new BadRequestException(`Payment is ${payment.status}`);
		}

		// Replay attack: reject if block hash was already used
		const duplicate = await this.paymentRepo.findOne({
			where: { txHash: dto.block_hash },
		});
		if (duplicate && duplicate.id !== payment.id) {
			throw new BadRequestException('Block hash already used');
		}

		// Save block hash early to prevent race conditions
		payment.txHash = dto.block_hash;
		payment.senderAddress = null;
		payment.status = 'processing';
		await this.paymentRepo.save(payment);

		// Verify on-chain
		if (dto.status === 'confirmed') {
			try {
				await this.verifyOnChain(dto.block_hash);
				payment.status = 'confirmed';
				await this.paymentRepo.save(payment);
				await this.orderService.updateOrderStatus(payment.orderId, 'paid');
				this.logger.log(
					`Payment confirmed: ${payment.id}, order: ${payment.orderId}`,
				);
				return {
					success: true,
					message: 'Payment confirmed',
					order_id: payment.orderId,
				};
			} catch (err) {
				this.logger.error(`On-chain verification failed: ${err.message}`);
				payment.status = 'failed';
				await this.paymentRepo.save(payment);
				await this.orderService.updateOrderStatus(payment.orderId, 'failed');
				throw new BadRequestException(
					`Payment verification failed: ${err.message}`,
				);
			}
		} else {
			payment.status = 'failed';
			await this.paymentRepo.save(payment);
			await this.orderService.updateOrderStatus(payment.orderId, 'failed');
			return { success: false, message: 'Payment reported as failed' };
		}
	}

	/**
	 * Get payment status by payment ID.
	 */
	async getPaymentStatus(paymentId: string): Promise<PaymentEntity> {
		const payment = await this.paymentRepo.findOne({
			where: { id: paymentId },
		});
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`);
		}
		return payment;
	}

	/**
	 * Verify Polkadot payment proof via Routescan API.
	 */
	private async verifyOnChain(txHash: string): Promise<void> {
		const proof = await this.scanService.verifyPaymentProof({
			txHash,
			recipient: this.config.polkadotMerchantAddress,
			minAmountPlanck: this.config.polkadotPaymentAmountPlanck,
		});

		if (!proof.ok) {
			throw new Error(proof.reason || 'Unable to verify payment proof');
		}
	}

	/**
	 * Get transaction details from block hash
	 */
	async getTransactionDetails(txHash: string): Promise<{
		success: boolean;
		msg?: string;
		code?: number;
		data?: {
			hash: string;
			amount: string;
			from: string;
			to: string;
			blockNumber: number;
			input?: string;
		};
	}> {
		try {
			// Use the scan service to get transaction details
			const detail = await this.scanService.getTransactionDetail(txHash);
			if (!detail) {
				this.logger.debug(`No transaction found for tx hash: ${txHash}`);
				return {
					success: true,
					msg: 'Transaction not found',
					code: 404,
					data: null,
				};
			}
			return {
				success: true,
				data: {
					hash: detail.hash,
					amount: detail.value,
					from: detail.from,
					to: detail.to,
					blockNumber: detail.blockNumber,
					input: detail.input,
				},
			};
		} catch (error) {
			this.logger.error(
				`Failed to get transaction details for tx hash ${txHash}:`,
				error,
			);
			return {
				success: false,
				code: 500,
				msg: error?.message || 'Unable to get transaction details',
				data: null,
			};
		}
	}
}
