import { Module } from '@nestjs/common';
import { RedisService } from '../common/redis.service';

@Module({
	providers: [RedisService],
	exports: [RedisService],
})
export class RedisModule {}
