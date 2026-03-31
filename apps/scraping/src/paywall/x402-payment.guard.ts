import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppConfigService } from '../config/app-config.service';
import { REQUIRE_PAYMENT_METADATA_KEY } from './require-payment.decorator';
import { ScanService } from './scan.service';

@Injectable()
export class X402PaymentGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly config: AppConfigService,
		private readonly scanService: ScanService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!this.config.x402Enabled) {
			return true;
		}

		const requiresPayment = this.reflector.getAllAndOverride<boolean>(
			REQUIRE_PAYMENT_METADATA_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiresPayment) {
			return true;
		}

		if (!this.scanService.isEnabled()) {
			throw new ServiceUnavailableException(
				'Payment network validation is currently unavailable',
			);
		}

		const req = context.switchToHttp().getRequest<Request>();
		const paymentHeader = (req.header('x-payment') || '').trim();
		const fallbackBlockHash = (req.header('x402-block-hash') || '').trim();
		const parsed = this.parsePaymentHeader(paymentHeader, fallbackBlockHash);

		if (!parsed.txHash) {
			return this.failPayment(req, 'Missing payment proof headers', {
				required_header: 'X-Payment',
				accepted_format: 'block=0x...',
			});
		}

		const proof = await this.scanService.verifyPaymentProof({
			txHash: parsed.txHash,
			recipient: this.config.polkadotMerchantAddress,
			minAmountPlanck: this.config.polkadotPaymentAmountPlanck,
		});

		if (!proof.ok) {
			return this.failPayment(req, proof.reason ?? 'Invalid payment proof', {
				block_hash: parsed.txHash,
			});
		}

		(req as Request & { x402Payment?: Record<string, any> }).x402Payment = {
			txHash: parsed.txHash,
			recipient: this.config.polkadotMerchantAddress,
			network: this.config.polkadotNetwork,
			token: this.config.polkadotCurrencySymbol,
			amountPlanck:
				proof.payment?.amountPlanck ?? this.config.polkadotPaymentAmountPlanck,
			payer: proof.payment?.from,
		};

		return true;
	}

	private parsePaymentHeader(
		paymentHeader: string,
		fallbackBlockHash: string,
	): { txHash?: string } {
		if (paymentHeader) {
			const values = paymentHeader
				.split(';')
				.map((part) => part.trim())
				.filter(Boolean)
				.reduce<Record<string, string>>((acc, part) => {
					const [rawKey, ...rawValue] = part.split('=');
					if (!rawKey || rawValue.length === 0) {
						return acc;
					}
					acc[rawKey.trim().toLowerCase()] = rawValue.join('=').trim();
					return acc;
				}, {});

			return {
				txHash: values.block || fallbackBlockHash || undefined,
			};
		}

		return {
			txHash: fallbackBlockHash || undefined,
		};
	}

	private failPayment(
		req: Request,
		message: string,
		details: Record<string, any>,
	): false {
		const res = (req as any).res;
		res.setHeader(
			'X-Payment-Required',
			`recipient=${this.config.polkadotMerchantAddress};amount=${this.config.polkadotPaymentAmountPlanck}`,
		);
		res.status(402).json({
			error: 'Payment Required',
			code: 'X402_PAYMENT_REQUIRED',
			message,
			details,
			payment: {
				network: this.config.polkadotNetwork,
				recipient: this.config.polkadotMerchantAddress,
				amount: this.config.polkadotPaymentAmountPlanck,
				currency: this.config.polkadotCurrencySymbol,
				verifier: 'routescan',
				instructions:
					'Submit a Balances.transfer or transfer_keep_alive to the merchant, then retry with X-Payment: block=0x...',
			},
		});

		return false;
	}
}
