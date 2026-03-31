import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	getHello(): object {
		return {
			name: 'Amazon Shopping Agent API',
			version: '1.0.0',
			status: 'running',
			timestamp: new Date().toISOString(),
		};
	}

	getHealth(): object {
		return {
			status: 'healthy',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV || 'development',
		};
	}
}
