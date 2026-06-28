# Database Migrations

## Overview

Each SQLite-backed service (auth-service, task-service, project-service) uses a file-based migration system. Migrations are numbered SQL files executed in order on startup.

## Structure

```
services/<service>/
├── migrations/
│   ├── 001_create_<table>.sql
│   └── 002_add_<column>.sql   ← future migrations
└── src/persistence/
    ├── migrator.ts             ← migration runner
    └── sqlite.ts               ← calls runMigrations() on init
```

## How It Works

1. On service startup, `init()` opens the SQLite database
2. `runMigrations(db, migrationsDir)` is called
3. The migrator creates a `schema_migrations` tracking table if absent
4. It reads all `.sql` files from the `migrations/` directory, sorted by name
5. Files not yet recorded in `schema_migrations` are executed in order
6. Each applied migration is recorded with a timestamp

## Adding a New Migration

1. Create `services/<service>/migrations/<NNN>_<description>.sql`
2. Use the next sequential number (e.g., `002_add_avatar_url.sql`)
3. Write standard SQL — multiple statements separated by `;` are supported

## Non-Breaking Migration Strategy

- **Add columns** as `NULLABLE` or with a `DEFAULT` value so existing rows remain valid
- **Never drop or rename** columns in the same release — deprecate first, remove in the next version
- **Keep old columns** for one release cycle to allow rolling deployments
- **New tables** are always safe since no existing code references them

## Example: Adding a Column

```sql
-- 002_add_avatar_url.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL;
```

## Testing

Each service has migration tests that verify:
- Migrations produce the correct schema (all expected columns exist)
- Migrations are idempotent (running twice applies nothing on the second run)
- The `schema_migrations` table tracks applied files