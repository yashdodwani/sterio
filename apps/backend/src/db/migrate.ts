import { migrate } from "drizzle-orm/postgres-js/migrator"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

export async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL or DATABASE_URL_DIRECT is required for migrations")

  const migrationClient = postgres(url, { max: 1 })
  const db = drizzle(migrationClient)

  try {
    await migrate(db, { migrationsFolder: "./src/db/migrations" })
    console.log("Migrations completed successfully")
  } finally {
    await migrationClient.end()
  }
}

// Bun entrypoint: bun run src/db/migrate.ts
if (import.meta.main) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err)
      process.exit(1)
    })
}
