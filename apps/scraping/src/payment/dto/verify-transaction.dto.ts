import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class VerifyTransactionRequestDto {
	@ApiProperty({
		description: 'The hash of the Polkadot transaction to verify',
		example: '0x123abc...',
	})
	@IsString()
	@IsNotEmpty()
	txHash: string;

	@ApiProperty({
		description: 'The ID of the user making the request',
		example: 'user_12345',
	})
	@IsString()
	@IsNotEmpty()
	userId: string;
}


export class VerifyTransactionDto {
	@ApiProperty({
		description: 'The recipient address of the transaction',
		example: '5DAAnrj7VHTz5kG2aZ4b8pX9sT1gZ9v1u2n3e4f5g6h7j8',
	})
	receiver: string;

	@ApiProperty({
		description: 'The amount transferred in the transaction',
		example: 100.5,
	})
	amount: number;

	@ApiProperty({
		description: 'The ID of the user making the request',
		example: 'user_12345',
	})
	@IsString()
	@IsNotEmpty()
	userId: string;
}
