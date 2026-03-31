export interface X402PaymentContext {
	txHash: string;
	recipient: string;
	network: string;
	token: string;
	amountPlanck: string;
	payer?: string;
}
