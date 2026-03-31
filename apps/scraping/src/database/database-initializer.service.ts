import { Logger } from '@nestjs/common';
import { Client } from 'pg';

const logger = new Logger('DatabaseInitializer');

export async function initializeDatabase(): Promise<void> {
	const dbUrl = process.env.DB_URL;
	const dbHost = process.env.DB_HOST || 'localhost';
	const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
	const dbUser = process.env.DB_USERNAME || 'postgres';
	const dbPassword = process.env.DB_PASSWORD;
	const dbName = process.env.DB_DATABASE || 'shopping_agent';

	// Connect to 'postgres' default database to create our target database
	const client = new Client({
		url: dbUrl, // Support DATABASE_URL for platforms like Heroku
		// host: dbHost,
		// port: dbPort,
		// user: dbUser,
		// password: dbPassword,
		database: dbName, // Connect to default postgres database
	});

	try {
	  await client.connect();
	  logger.log("Connected to PostgreSQL server");

	  // Check if database exists
	  const result = await client.query(
	    `SELECT 1 FROM pg_database WHERE datname = $1`,
	    [dbName],
	  );

	  if (result.rows.length === 0) {
	    // Database doesn't exist, create it
	    logger.log(`Database "${dbName}" does not exist. Creating...`);
	    await client.query(`CREATE DATABASE "${dbName}"`);
	    logger.log(`✅ Database "${dbName}" created successfully`);
	  } else {
	    logger.log(`✅ Database "${dbName}" already exists`);
	  }
	} catch (error) {
	  logger.error(
	    `Failed to initialize database: ${error.message}`,
	    error.stack,
	  );
	  // Don't throw - let TypeORM handle connection errors
	} finally {
	  await client.end();
	}
}
