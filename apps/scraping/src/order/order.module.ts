import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity } from '../database/entities/cart.entity';
import { OrderEntity } from '../database/entities/order.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
	imports: [TypeOrmModule.forFeature([OrderEntity, CartEntity])],
	providers: [OrderService],
	controllers: [OrderController],
	exports: [OrderService],
})
export class OrderModule {}
