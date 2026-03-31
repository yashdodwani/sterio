import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeDatabase } from './database/database-initializer.service';

async function bootstrap() {
	// Initialize database before creating NestJS app
	await initializeDatabase();

	const app = await NestFactory.create(AppModule);

	// Enable CORS
	app.enableCors();

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	);

	// Global prefix
	app.setGlobalPrefix('api');

	const port = process.env.PORT || 3000;
	await app.listen(port);

	console.log(`🚀 Amazon Shopping Agent running on port ${port}`);
	console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
