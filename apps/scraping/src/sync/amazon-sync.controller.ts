import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AmazonSyncService } from './amazon-sync.service';

@Controller('admin/sync')
export class AmazonSyncController {
	constructor(private readonly syncService: AmazonSyncService) {}

	/**
	 * Trigger manual full sync
	 */
	@Post('trigger/full')
	async triggerFullSync(@Body() body: { queries: string[] }) {
		const { queries } = body;

		if (!queries || queries.length === 0) {
			throw new Error('Queries are required');
		}

		const job = await this.syncService.fullSync(queries);

		return {
			success: true,
			message: 'Full sync started',
			jobId: job.id,
		};
	}

	/**
	 * Trigger price refresh
	 */
	@Post('trigger/price-refresh')
	async triggerPriceRefresh() {
		const job = await this.syncService.priceRefreshSync();

		return {
			success: true,
			message: 'Price refresh started',
			jobId: job.id,
		};
	}

	/**
	 * Get sync job status
	 */
	@Get('status/:jobId')
	async getJobStatus(@Param('jobId') jobId: string) {
		const job = await this.syncService.getSyncJobStatus(jobId);

		return {
			success: true,
			data: job,
		};
	}

	/**
	 * Get recent sync jobs
	 */
	@Get('jobs')
	async getRecentJobs() {
		const jobs = await this.syncService.getRecentJobs(20);

		return {
			success: true,
			data: jobs,
		};
	}
}
