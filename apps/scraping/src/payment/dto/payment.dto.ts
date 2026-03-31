import { IsEnum, IsString, IsUUID } from 'class-validator';

export class GeneratePaymentRequestDto {
	@IsUUID()
	order_id: string;

	@IsString()
	user_id: string;
}

export class PaymentWebhookDto {
	@IsString()
	payment_id: string;

	@IsString()
	block_hash: string;

	@IsEnum(['confirmed', 'failed'])
	status: 'confirmed' | 'failed';
}
