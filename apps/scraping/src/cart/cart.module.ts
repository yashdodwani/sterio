import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity } from '../database/entities/cart.entity';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
	imports: [TypeOrmModule.forFeature([CartEntity])],
	providers: [CartService],
	controllers: [CartController],
	exports: [CartService],
})
export class CartModule {}
