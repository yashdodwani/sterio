import { PriceAlertEntity } from '@/database/entities';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface CreatePriceAlertDto {
	userId: string;
	asin: string;
	targetPrice: number;
}

export interface PriceAlertResponse {
	id: string;
	userId: string;
	asin: string;
	targetPrice: number;
	isActive: boolean;
	createdAt: Date;
	notifiedAt?: Date;
}

@Injectable()
export class PriceAlertService {
	private readonly logger = new Logger(PriceAlertService.name);

	constructor(
		@InjectRepository(PriceAlertEntity)
		private readonly priceAlertRepo: Repository<PriceAlertEntity>,
	) {}

	async createAlert(dto: CreatePriceAlertDto): Promise<PriceAlertResponse> {
		try {
			// Check if alert already exists
			const existingAlert = await this.priceAlertRepo.findOne({
				where: {
					userId: dto.userId,
					asin: dto.asin,
					isActive: true,
				},
			});

			if (existingAlert) {
				throw new Error(`Price alert already exists for ${dto.asin}`);
			}

			const alert = this.priceAlertRepo.create({
				userId: dto.userId,
				asin: dto.asin,
				targetPrice: dto.targetPrice,
			});

			const savedAlert = await this.priceAlertRepo.save(alert);

			this.logger.log(
				`Created price alert for user ${dto.userId}: ${dto.asin} at $${dto.targetPrice}`,
			);

			return this.mapToResponse(savedAlert);
		} catch (error) {
			this.logger.error(`Failed to create price alert`, error);
			throw error;
		}
	}

	async getUserAlerts(userId: string): Promise<PriceAlertResponse[]> {
		const alerts = await this.priceAlertRepo.find({
			where: { userId },
			order: { createdAt: 'DESC' },
		});

		return alerts.map((alert) => this.mapToResponse(alert));
	}

	async deleteAlert(userId: string, alertId: string): Promise<void> {
		const alert = await this.priceAlertRepo.findOne({
			where: { id: alertId, userId },
		});

		if (!alert) {
			throw new NotFoundException(`Price alert not found`);
		}

		await this.priceAlertRepo.remove(alert);
		this.logger.log(`Deleted price alert ${alertId} for user ${userId}`);
	}

	async deactivateAlert(alertId: string): Promise<void> {
		const result = await this.priceAlertRepo.update(
			{ id: alertId },
			{ isActive: false },
		);

		if (result.affected === 0) {
			throw new NotFoundException(`Price alert not found`);
		}

		this.logger.log(`Deactivated price alert ${alertId}`);
	}

	private mapToResponse(alert: PriceAlertEntity): PriceAlertResponse {
		return {
			id: alert.id,
			userId: alert.userId,
			asin: alert.asin,
			targetPrice: alert.targetPrice,
			isActive: alert.isActive,
			createdAt: alert.createdAt,
			notifiedAt: alert.notifiedAt,
		};
	}
}
