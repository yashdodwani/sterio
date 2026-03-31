import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NormalizedProduct } from '../../common/interfaces';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
	private readonly logger = new Logger(ProductRepository.name);

	constructor(
		@InjectRepository(ProductEntity)
		private repository: Repository<ProductEntity>,
	) {}

	/**
	 * Upsert a single product
	 */
	async upsert(product: NormalizedProduct): Promise<ProductEntity> {
		try {
			const entity = this.repository.create(product);
			return await this.repository.save(entity);
		} catch (error) {
			this.logger.error(
				`Failed to upsert product ${product.asin}: ${error.message}`,
			);
			throw error;
		}
	}

	/**
	 * Upsert multiple products
	 */
	async upsertBatch(products: NormalizedProduct[]): Promise<void> {
		try {
			this.logger.log(`Upserting ${products.length} products...`);

			await this.repository.save(products, {
				chunk: 100, // Process in chunks
			});

			this.logger.log(`Successfully upserted ${products.length} products`);
		} catch (error) {
			this.logger.error(`Batch upsert failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Find product by ASIN
	 */
	async findByAsin(asin: string): Promise<ProductEntity | null> {
		return await this.repository.findOne({ where: { asin } });
	}

	/**
	 * Find products by ASINs
	 */
	async findByAsins(asins: string[]): Promise<ProductEntity[]> {
		return await this.repository
			.createQueryBuilder('product')
			.where('product.asin IN (:...asins)', { asins })
			.getMany();
	}

	/**
	 * Search products (basic)
	 */
	async search(query: string, limit: number = 20): Promise<ProductEntity[]> {
		return await this.repository
			.createQueryBuilder('product')
			.where('product.title ILIKE :query', { query: `%${query}%` })
			.orWhere('product.brand ILIKE :query', { query: `%${query}%` })
			.orWhere('product.category ILIKE :query', { query: `%${query}%` })
			.orderBy('product.rating', 'DESC')
			.addOrderBy('product.reviewCount', 'DESC')
			.limit(limit)
			.getMany();
	}

	/**
	 * Get products by category
	 */
	async findByCategory(
		category: string,
		limit: number = 50,
	): Promise<ProductEntity[]> {
		return await this.repository.find({
			where: { category },
			order: { rating: 'DESC', reviewCount: 'DESC' },
			take: limit,
		});
	}

	/**
	 * Get products by brand
	 */
	async findByBrand(
		brand: string,
		limit: number = 50,
	): Promise<ProductEntity[]> {
		return await this.repository.find({
			where: { brand },
			order: { rating: 'DESC', reviewCount: 'DESC' },
			take: limit,
		});
	}

	/**
	 * Get products that need price refresh
	 */
	async getStaleProducts(hours: number = 12): Promise<ProductEntity[]> {
		const cutoffDate = new Date();
		cutoffDate.setHours(cutoffDate.getHours() - hours);

		return await this.repository
			.createQueryBuilder('product')
			.where('product.lastUpdated < :cutoffDate', { cutoffDate })
			.orderBy('product.lastUpdated', 'ASC')
			.limit(100)
			.getMany();
	}

	/**
	 * Count total products
	 */
	async count(): Promise<number> {
		return await this.repository.count();
	}

	/**
	 * Delete product
	 */
	async delete(asin: string): Promise<void> {
		await this.repository.delete({ asin });
	}
}
