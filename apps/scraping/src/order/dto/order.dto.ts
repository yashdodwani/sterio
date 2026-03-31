import { IsString } from 'class-validator';

export class CheckoutDto {
	@IsString()
	cart_id: string;

	@IsString()
	user_id: string;
}
