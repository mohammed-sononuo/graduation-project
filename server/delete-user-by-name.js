/**
 * One-off script: delete user(s) by name or email from app_users.
 *
 * Usage (PowerShell):
 *   node server/delete-user-by-name.js "هاله"
 *   node server/delete-user-by-name.js "user@example.com"
 *
 * What it deletes:
 * - app_users rows (and FK-cascaded rows: student_profiles, notifications, event_registrations, app_module_data, etc.)
 * - login_codes rows for the deleted users' emails (login_codes isn't FK-linked)
 *
 * Notes:
 * - events.created_by is ON DELETE SET NULL (events remain).
 * - event_reviews.user_id is ON DELETE SET NULL (reviews remain).
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
// Same default as server/index.js (override with DATABASE_URL in .env)
const DEFAULT_DATABASE_URL =
  'postgresql://postgres:Ss%402004%24@10.20.10.20:5433/graduation%20Project';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL });

function usageAndExit() {
  console.error('Usage: node server/delete-user-by-name.js "<name-or-email>"');
  process.exit(1);
}

async function main() {
  const needleRaw = process.argv[2];
  if (!needleRaw || !needleRaw.trim()) usageAndExit();
  const needle = needleRaw.trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Match by:
    // - exact email
    // - exact first_name / middle_name / last_name
    // - exact "first last" (with single space)
    const usersRes = await client.query(
      `
      SELECT id, email, role, first_name, middle_name, last_name
      FROM app_users
      WHERE email = $1
         OR first_name = $1
         OR middle_name = $1
         OR last_name = $1
         OR (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) = $1
      ORDER BY id ASC
      `,
      [needle]
    );

    if (usersRes.rowCount === 0) {
      await client.query('ROLLBACK');
      console.log(`No matching account found for: ${needle}`);
      return;
    }

    const ids = usersRes.rows.map((r) => r.id);
    const emails = usersRes.rows.map((r) => r.email).filter(Boolean);

    // login_codes isn't FK-related, so remove by email explicitly (if table exists)
    let loginCodesDeleted = 0;
    if (emails.length) {
      try {
        const delCodes = await client.query('DELETE FROM login_codes WHERE email = ANY($1::text[])', [
          emails,
        ]);
        loginCodesDeleted = delCodes.rowCount ?? 0;
      } catch (e) {
        if (e.code !== '42P01') throw e; // ignore if table doesn't exist
      }
    }

    const delUsers = await client.query('DELETE FROM app_users WHERE id = ANY($1::int[])', [ids]);
    const usersDeleted = delUsers.rowCount ?? 0;

    await client.query('COMMIT');

    console.log(
      `Deleted ${usersDeleted} app_users row(s) and ${loginCodesDeleted} login_codes row(s) for: ${needle}`
    );
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error:', e?.message ?? e);
  process.exit(1);
});
