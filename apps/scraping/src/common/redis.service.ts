import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private client: Redis;

	constructor(private readonly config: AppConfigService) {}

	async onModuleInit(): Promise<void> {
		const redisOptions: any = {
			host: this.config.redisHost,
			port: this.config.redisPort,
			maxRetriesPerRequest: 3,
			lazyConnect: true,
		};

		if (this.config.redisPassword) {
			redisOptions.password = this.config.redisPassword;
		}

		this.client = new Redis(redisOptions);

		this.client.on('connect', () => {
			this.logger.log('Connected to Redis');
		});

		this.client.on('error', (error) => {
			this.logger.error('Redis connection error:', error);
		});

		try {
			await this.client.connect();
		} catch (error) {
			this.logger.error('Failed to connect to Redis:', error);
		}
	}

	async onModuleDestroy(): Promise<void> {
		if (this.client) {
			await this.client.quit();
			this.logger.log('Disconnected from Redis');
		}
	}

	/**
	 * Set a key with expiration time
	 */
	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		try {
			if (ttlSeconds) {
				await this.client.setex(key, ttlSeconds, value);
			} else {
				await this.client.set(key, value);
			}
		} catch (error) {
			this.logger.error(`Redis SET error for key ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Get a value by key
	 */
	async get(key: string): Promise<string | null> {
		try {
			return await this.client.get(key);
		} catch (error) {
			this.logger.error(`Redis GET error for key ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Delete a key
	 */
	async del(key: string): Promise<number> {
		try {
			return await this.client.del(key);
		} catch (error) {
			this.logger.error(`Redis DEL error for key ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Check if key exists
	 */
	async exists(key: string): Promise<boolean> {
		try {
			const result = await this.client.exists(key);
			return result === 1;
		} catch (error) {
			this.logger.error(`Redis EXISTS error for key ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Set key only if it doesn't exist (for idempotency)
	 */
	async setnx(
		key: string,
		value: string,
		ttlSeconds?: number,
	): Promise<boolean> {
		try {
			const result = await this.client.setnx(key, value);
			if (result === 1 && ttlSeconds) {
				await this.client.expire(key, ttlSeconds);
			}
			return result === 1;
		} catch (error) {
			this.logger.error(`Redis SETNX error for key ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Acquire a distributed lock
	 */
	async acquireLock(
		lockKey: string,
		ttlSeconds: number = 30,
	): Promise<string | null> {
		try {
			const lockValue = `lock:${Date.now()}:${Math.random()}`;
			const acquired = await this.client.set(
				lockKey,
				lockValue,
				'EX',
				ttlSeconds,
				'NX',
			);
			return acquired === 'OK' ? lockValue : null;
		} catch (error) {
			this.logger.error(`Redis lock acquisition error for key ${lockKey}:`, error);
			throw error;
		}
	}

	/**
	 * Release a distributed lock
	 */
	async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
		try {
			const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;
			const result = await this.client.eval(script, 1, lockKey, lockValue);
			return result === 1;
		} catch (error) {
			this.logger.error(`Redis lock release error for key ${lockKey}:`, error);
			throw error;
		}
	}

	/**
	 * Extend lock TTL
	 */
	async extendLock(
		lockKey: string,
		lockValue: string,
		ttlSeconds: number,
	): Promise<boolean> {
		try {
			const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("EXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
			const result = await this.client.eval(
				script,
				1,
				lockKey,
				lockValue,
				ttlSeconds.toString(),
			);
			return result === 1;
		} catch (error) {
			this.logger.error(`Redis lock extension error for key ${lockKey}:`, error);
			throw error;
		}
	}

	/**
	 * Get client instance (for advanced operations)
	 */
	getClient(): Redis {
		return this.client;
	}
}
