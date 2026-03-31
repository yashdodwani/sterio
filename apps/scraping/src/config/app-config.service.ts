import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
	constructor(private configService: ConfigService) {}

	// Server
	get port(): number {
		return this.configService.get<number>('PORT', 3000);
	}

	get nodeEnv(): string {
		return this.configService.get<string>('NODE_ENV', 'development');
	}

	// Database
	get dbUrl(): string {
		return this.configService.get<string>('DB_URL', '');
	}

	get dbHost(): string {
		return this.configService.get<string>('DB_HOST', 'localhost');
	}

	get dbPort(): number {
		return this.configService.get<number>('DB_PORT', 5432);
	}

	get dbUsername(): string {
		return this.configService.get<string>('DB_USERNAME', 'postgres');
	}

	get dbPassword(): string {
		return this.configService.get<string>('DB_PASSWORD');
	}

	get dbDatabase(): string {
		return this.configService.get<string>('DB_DATABASE', 'amazon_shopping_agent');
	}

	get dbSynchronize(): boolean {
		return this.asBoolean(this.configService.get<string>('DB_SYNCHRONIZE', 'false'));
	}

	get dbMigrationsRun(): boolean {
		return this.asBoolean(
			this.configService.get<string>('DB_MIGRATIONS_RUN', 'false'),
		);
	}

	// Meilisearch
	get meilisearchHost(): string {
		return this.configService.get<string>(
			'MEILISEARCH_HOST',
			'http://localhost:7700',
		);
	}

	get meilisearchApiKey(): string {
		return this.configService.get<string>('MEILISEARCH_API_KEY');
	}

	// OpenAI
	get openaiApiKey(): string {
		return this.configService.get<string>('OPENAI_API_KEY');
	}

	get openaiModel(): string {
		return this.configService.get<string>('OPENAI_MODEL', 'gpt-4');
	}

	// Browser Use Cloud API
	get browserUseApiUrl(): string {
		return this.configService.get<string>(
			'BROWSER_USE_API_URL',
			'https://api.cloud.browser-use.com',
		);
	}

	get browserUseApiKey(): string {
		return this.configService.get<string>('BROWSER_USE_API_KEY');
	}

	// Apify
	get apifyApiToken(): string {
		return this.configService.get<string>('APIFY_API_TOKEN');
	}

	// Amazon Affiliate
	get amazonAffiliateTag(): string {
		return this.configService.get<string>('AMAZON_AFFILIATE_TAG');
	}

	// Redis
	get redisHost(): string {
		return this.configService.get<string>('REDIS_HOST', 'localhost');
	}

	get redisPort(): number {
		return this.configService.get<number>('REDIS_PORT', 6379);
	}

	get redisPassword(): string | undefined {
		return this.configService.get<string>('REDIS_PASSWORD');
	}

	// Cron Schedules
	get priceRefreshCron(): string {
		return this.configService.get<string>('PRICE_REFRESH_CRON', '0 */12 * * *');
	}

	get fullSyncCron(): string {
		return this.configService.get<string>('FULL_SYNC_CRON', '0 0 * * *');
	}

	// Polkadot payment
	get polkadotNetwork(): string {
		return this.configService.get<string>('POLKADOT_NETWORK', 'polkadot');
	}

	get polkadotMerchantAddress(): string {
		return this.configService.get<string>('POLKADOT_MERCHANT_ADDRESS', '');
	}

	get polkadotPaymentAmountPlanck(): string {
		return this.configService.get<string>(
			'POLKADOT_PAYMENT_AMOUNT_PLANCK',
			'1000000000',
		);
	}

	get polkadotCurrencySymbol(): string {
		return this.configService.get<string>('POLKADOT_CURRENCY_SYMBOL', 'DOT');
	}

	// x402-style paywall
	get x402Enabled(): boolean {
		return this.asBoolean(this.configService.get<string>('X402_ENABLED', 'true'));
	}

	get x402RequireHealthy(): boolean {
		return this.asBoolean(
			this.configService.get<string>('X402_REQUIRE_HEALTHY', 'false'),
		);
	}

	get scanApiKey(): string {
		return this.configService.get<string>('SCAN_API_KEY', '');
	}

	get scanBaseUrl(): string {
		return this.configService.get<string>(
			'SCAN_BASE_URL',
			'https://api.routescan.io/v2/network/testnet/evm/420420417/etherscan/api',
		);
	}

	// Comagent
	get comagentBaseUrl(): string {
		return this.configService.get<string>(
			'COMAGENT_BASE_URL',
			'http://localhost:3001',
		);
	}

	get depositWebhookSecret(): string {
		return this.configService.get<string>('DEPOSIT_WEBHOOK_SECRET', '');
	}

	private asBoolean(value: string): boolean {
		return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
	}
}
