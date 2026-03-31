import { HttpService } from '@nestjs/axios';
import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';

import { formatUnits } from 'ethers';
import { firstValueFrom } from 'rxjs';
import {
	convertHexToDecimal,
	convertHexToString,
	normalizeAccountHex,
	safeBigInt,
} from '../common/utils/blockchain.utils';
import { AppConfigService } from '../config/app-config.service';

const SYSTEM_EVENTS_STORAGE_KEY =
	'0x26aa394eea5630e07c48ae0c9558cef70a98fdbe9ce6c55837576c60c7af3850';

@Injectable()
export class ScanService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(ScanService.name);

	private enabled = false;

	constructor(
		private readonly config: AppConfigService,
		private readonly httpService: HttpService,
	) {}

	async onModuleInit(): Promise<void> {
		if (!this.config.scanApiKey) {
			this.logger.warn(
				'SCAN_API_KEY is missing. Payment verification is disabled.',
			);
			return;
		}

		this.enabled = true;
		this.logger.log('Routescan payment verifier initialized');
	}

	async onModuleDestroy(): Promise<void> {
		// No cleanup needed for Routescan API
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	async verifyPaymentProof(input: {
		txHash: string;
		recipient: string;
		minAmountPlanck: string;
	}): Promise<{
		ok: boolean;
		reason?: string;
		payment?: {
			from?: string;
			to: string;
			amountPlanck: string;
			txHash: string;
		};
	}> {
		const txHash = input.txHash.trim();
		const recipientHex = normalizeAccountHex(input.recipient);
		const minAmountPlanck = safeBigInt(input.minAmountPlanck);

		if (!txHash || !recipientHex || minAmountPlanck === null) {
			return { ok: false, reason: 'Invalid payment proof format' };
		}

		this.logger.debug(`[VERIFY] Looking for payment in block: ${txHash}`);
		this.logger.debug(`[VERIFY] Expected recipient (hex): ${recipientHex}`);
		this.logger.debug(`[VERIFY] Minimum amount: ${minAmountPlanck}`);

		try {
			// Get block details from Routescan
			const transaction = await this.getTransactionDetail(txHash);
			if (!transaction) {
				return { ok: false, reason: 'Unable to fetch transaction details' };
			}

			const blockNum = transaction.blockNumber;
			this.logger.debug(`[VERIFY] Block number: ${blockNum}`);

			// Get transfers for the recipient in this block
			const transfers = await this.getTransfersForBlock(recipientHex, blockNum);
			this.logger.debug(
				`[VERIFY] Found ${transfers.length} transfers for recipient in block ${blockNum}`,
			);

			for (const transfer of transfers) {
				const toHex = normalizeAccountHex(transfer.to || '');
				const fromHex = normalizeAccountHex(transfer.from || '');
				const amountPlanck = safeBigInt(transfer.amount || '0');

				this.logger.debug(
					`[VERIFY] Transfer: from=${fromHex}, to=${toHex}, amount=${amountPlanck}`,
				);

				const match =
					toHex &&
					recipientHex &&
					toHex.toLowerCase() === recipientHex.toLowerCase();
				const amountOk = amountPlanck !== null && amountPlanck >= minAmountPlanck;

				this.logger.debug(`[VERIFY] Match: ${toHex} == ${recipientHex}: ${match}`);
				this.logger.debug(
					`[VERIFY] Amount ok: ${amountPlanck} >= ${minAmountPlanck}: ${amountOk}`,
				);

				if (match && amountOk) {
					this.logger.log(`[VERIFY] MATCH FOUND!`);
					return {
						ok: true,
						payment: {
							from: fromHex || undefined,
							to: toHex!,
							amountPlanck: amountPlanck!.toString(),
							txHash,
						},
					};
				}
			}

			this.logger.debug(`[VERIFY] No matching transfer found`);
			return { ok: false, reason: 'No matching transfer found in block' };
		} catch (error) {
			this.logger.warn(`verifyPaymentProof failed: ${error?.message ?? error}`);
			return { ok: false, reason: 'Unable to verify payment proof' };
		}
	}

	public async getTransactionDetail(txHash: string): Promise<{
		hash: string;
		from: string;
		to: string;
		value: string;
		amount: string;
		blockNumber: number;
		input?: string;
	} | null> {
		try {
			const response = await firstValueFrom(
				this.httpService.get(`${this.config.scanBaseUrl}`, {
					params: {
						module: 'proxy',
						action: 'eth_getTransactionByHash',
						txhash: txHash,
						apikey: this.config.scanApiKey,
					},
				}),
			);
			console.log('Routescan getTransactionByHash response:', response.data);

			if (!response.data?.result || !response.data?.jsonrpc) {
				console.log(`No transaction found for hash: ${txHash}`);
				return null;
			}

			const result = response.data.result;
			const value = convertHexToDecimal(result.value).toString();

			// Convert hex values to readable formats
			const convertedResult = {
				hash: result.hash,
				from: result.from,
				to: result.to,
				value,
				amount: formatUnits(value, 18).toString(),
				blockNumber: convertHexToDecimal(result.blockNumber),
				input: result.input ? convertHexToString(result.input) : undefined,
			};

			return convertedResult;
		} catch (error) {
			this.logger.warn(
				`Failed to get transaction detail: ${error?.message ?? error}`,
			);
			return null;
		}
	}

	private async getTransfersForBlock(
		recipientHex: string,
		blockNum: number,
	): Promise<
		Array<{
			from: string;
			to: string;
			amount: string;
			block_num: number;
		}>
	> {
		try {
			// Routescan uses GET requests with query parameters for Etherscan-like API
			const response = await firstValueFrom(
				this.httpService.get(`${this.config.scanBaseUrl}`, {
					params: {
						module: 'account',
						action: 'txlist',
						address: recipientHex,
						startblock: blockNum,
						endblock: blockNum,
						page: 1,
						offset: 100,
						sort: 'asc',
						apikey: this.config.scanApiKey,
					},
				}),
			);

			if (response.data?.result && Array.isArray(response.data.result)) {
				return response.data.result.map((tx: any) => ({
					from: tx.from || '',
					to: tx.to || '',
					amount: tx.value || '0',
					block_num: parseInt(tx.blockNumber, 10) || 0,
				}));
			}
			return [];
		} catch (error) {
			this.logger.warn(`Failed to get transfers: ${error?.message ?? error}`);
			return [];
		}
	}
}
