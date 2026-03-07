# Project PostgreSQL data

Database files for this project are stored in this folder.

- **Port:** `5433` (so it doesn’t conflict with a main PostgreSQL on 5432)
- **Database name:** `Graduation Project`
- **User:** `postgres` (no password by default for this local cluster)

**Start server (from project root):**
```powershell
.\scripts\start-db.ps1
```

**Stop server:**
```powershell
.\scripts\stop-db.ps1
```

**Connect (e.g. psql):**
```powershell
psql -U postgres -d "Graduation Project" -p 5433
```

Connection string for apps: `postgresql://postgres@localhost:5433/Graduation%20Project`

---

## Schema and migrations

Migrations live in `db/migrations/`. Run in order with:
```bash
node server/run-migrations.js
```

**Core tables:** `app_users`, `colleges`, `majors`, `events`, `event_registrations`, `student_profiles`, `notifications`.

**Future-ready:**

- **Chatbot** (`009_chatbot.sql`): `chat_conversations` (one per user thread), `chat_messages` (role: user / assistant / system, content). Use these when you build the chatbot; add API routes and UI that read/write these tables.
- **Module data** (`010_module_data.sql`): `app_module_data` stores keyed JSON per module (`module_name`, optional `user_id`, `key`, `value`). Use for any new feature (e.g. chatbot settings, user preferences, feature flags) without new migrations. Example: `module_name = 'chatbot'`, `user_id = 5`, `key = 'settings'`, `value = { "model": "gpt-4" }`.
