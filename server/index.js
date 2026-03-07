import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { isEmailAllowed, MIN_PASSWORD_LENGTH, isAdminRole, isDeanRole, isSupervisorRole, isCommunityLeaderRole, isStudentRole } from '../config/rules.js';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'graduation-project-secret';

// Default DB: 10.20.10.20:5433, user postgres, database "graduation Project" (override with DATABASE_URL in .env)
const DEFAULT_DATABASE_URL = 'postgresql://postgres:Ss%402004%24@10.20.10.20:5433/graduation%20Project';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
});

const ADMIN_EMAIL = 'admin@najah.edu';
const ADMIN_PASSWORD = '123456';

async function ensureAdminUser() {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const r = await client.query('SELECT 1 FROM app_users WHERE email = $1 LIMIT 1', [ADMIN_EMAIL]);
    if (r.rows.length > 0) {
      await client.query(
        "UPDATE app_users SET password_hash = $1, role = 'admin' WHERE email = $2",
        [hash, ADMIN_EMAIL]
      );
      console.log('Admin user password refreshed: admin@najah.edu');
      return true;
    }
    const old = await client.query("SELECT 1 FROM app_users WHERE email = 'admin' LIMIT 1");
    if (old.rows.length > 0) {
      await client.query(
        "UPDATE app_users SET email = $1, password_hash = $2, role = 'admin' WHERE email = 'admin'",
        [ADMIN_EMAIL, hash]
      );
      console.log('Admin user migrated to admin@najah.edu');
      return true;
    }
    await client.query(
      "INSERT INTO app_users (email, password_hash, role) VALUES ($1, $2, 'admin')",
      [ADMIN_EMAIL, hash]
    );
    console.log('Admin user created: admin@najah.edu, password 123456');
    return true;
  } catch (err) {
    console.error('ensureAdminUser failed:', err?.message || err);
    if (err?.code === '42P01') {
      console.error('Table app_users missing. Run: npm run migrate');
    }
    return false;
  } finally {
    client.release();
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' })); // allow base64 images for profile picture

/** Build user object from DB row (no password_hash). Includes college_id (dean), community_id (supervisor), must_change_password, must_complete_profile. id forced to number for consistent JSON/JWT. */
function toUser(row) {
  const name = row.name ?? (([row.first_name, row.last_name].filter(Boolean).join(' ') || row.email));
  return {
    id: row.id != null ? Number(row.id) : undefined,
    email: row.email,
    role: row.role,
    name,
    created_at: row.created_at,
    college_id: row.college_id != null ? Number(row.college_id) : undefined,
    community_id: row.community_id != null ? Number(row.community_id) : undefined,
    must_change_password: Boolean(row.must_change_password),
    must_complete_profile: Boolean(row.must_complete_profile),
  };
}

/** Optional auth: set req.user from JWT if present. */
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const r = await pool.query(
      'SELECT id, email, role, created_at, college_id, community_id, first_name, last_name, must_change_password, must_complete_profile FROM app_users WHERE id = $1',
      [payload.userId]
    );
    req.user = r.rows[0] ? toUser(r.rows[0]) : null;
  } catch {
    req.user = null;
  }
  next();
}

/** Require auth; 401 if not logged in. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/** Require admin role (admin has all permissions: events, approval, dashboard, and any future admin feature). */
function requireAdmin(req, res, next) {
  if (!req.user || !isAdminRole(req.user.role)) return res.status(403).json({ error: 'Admin access required' });
  next();
}

/** Attach permissions to user object (admin = full access; dean, supervisor, community leader, student have role-specific permissions). Role 'user' is treated as student. */
function withPermissions(user) {
  if (!user) return user;
  const admin = isAdminRole(user.role);
  const dean = isDeanRole(user.role);
  const supervisor = isSupervisorRole(user.role);
  const communityLeader = isCommunityLeaderRole(user.role);
  const student = isStudentRole(user.role) || user.role === 'user';
  return {
    ...user,
    permissions: {
      admin,
      dean,
      supervisor,
      communityLeader,
      student,
      manageEvents: admin,
      approveEvents: admin,
      dashboard: admin,
    },
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend running' });
});

/** GET /api/auth/me — return current user from DB using Bearer token (includes permissions, collegeName/communityName for dean/supervisor). */
app.get('/api/auth/me', optionalAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = withPermissions(req.user);
  if (user.college_id) {
    const r = await pool.query('SELECT name FROM colleges WHERE id = $1', [user.college_id]);
    user.collegeName = r.rows[0]?.name;
  }
  if (user.community_id) {
    const r = await pool.query('SELECT name FROM communities WHERE id = $1', [user.community_id]);
    user.communityName = r.rows[0]?.name;
  }
  res.json({ user });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  if (!isEmailAllowed(emailNorm)) {
    return res.status(400).json({
      error: 'Please use a university email (@stu.najah.edu or @najah.edu).',
    });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  try {
    const existing = await pool.query('SELECT 1 FROM app_users WHERE email = $1 LIMIT 1', [emailNorm]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      "INSERT INTO app_users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role, created_at, college_id, community_id",
      [emailNorm, hash]
    );
    const row = r.rows[0];
    const user = withPermissions(toUser({ ...row, name: row.email }));
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const raw = req.body || {};
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  const password = typeof raw.password === 'string' ? raw.password.trim() : '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const emailNorm = email.toLowerCase();
  try {
    let r = await pool.query(
      'SELECT id, email, password_hash, role, created_at, college_id, community_id, first_name, last_name, must_change_password, must_complete_profile FROM app_users WHERE email = $1 LIMIT 1',
      [emailNorm]
    );
    let row = r.rows[0];
    if (!row && emailNorm === ADMIN_EMAIL) {
      await ensureAdminUser();
      r = await pool.query(
        'SELECT id, email, password_hash, role, created_at, college_id, community_id, first_name, last_name, must_change_password, must_complete_profile FROM app_users WHERE email = $1 LIMIT 1',
        [emailNorm]
      );
      row = r.rows[0];
    }
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const hash = row.password_hash;
    if (!hash || typeof hash !== 'string') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    let match = false;
    try {
      match = await bcrypt.compare(password, hash);
    } catch (bcryptErr) {
      console.error('Login bcrypt error:', bcryptErr);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = withPermissions(toUser(row));
    if (!user || !user.id) {
      console.error('Login: invalid user object after toUser');
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
    if (user.college_id != null) {
      const cr = await pool.query('SELECT name FROM colleges WHERE id = $1', [user.college_id]);
      user.collegeName = cr.rows[0]?.name;
    }
    if (user.community_id != null) {
      const cr = await pool.query('SELECT name FROM communities WHERE id = $1', [user.community_id]);
      user.communityName = cr.rows[0]?.name;
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err?.message || err);
    if (err?.code === '42P01') {
      return res.status(503).json({ error: 'Database not ready. Run migrations: npm run migrate' });
    }
    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Cannot connect to database. Check DATABASE_URL and that the database is running.' });
    }
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  const { credential, access_token } = req.body || {};
  if (!credential && !access_token) {
    return res.status(400).json({ error: 'Missing Google credential or access_token' });
  }
  try {
    let data;
    if (credential) {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const resp = await fetch(url);
      data = await resp.json();
      if (!resp.ok) {
        return res.status(401).json({ error: 'Invalid Google sign-in. Please try again.' });
      }
    } else {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      data = await resp.json();
      if (!resp.ok) {
        return res.status(401).json({ error: 'Invalid Google sign-in. Please try again.' });
      }
    }
    const email = data.email;
    if (!email || (data.email_verified === false)) {
      return res.status(401).json({ error: 'Could not verify your Google account.' });
    }
    if (!isEmailAllowed(email)) {
      return res.status(403).json({
        error: 'Please use a Najah University Google account (@stu.najah.edu or @najah.edu).',
      });
    }
    const emailNorm = email.trim().toLowerCase();
    let row = (await pool.query('SELECT id, email, role, created_at, college_id, community_id FROM app_users WHERE email = $1 LIMIT 1', [emailNorm])).rows[0];
    if (!row) {
      const hash = await bcrypt.hash(Math.random().toString(36), 10);
      const r = await pool.query(
        "INSERT INTO app_users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role, created_at, college_id, community_id",
        [emailNorm, hash]
      );
      row = r.rows[0];
    }
    const user = withPermissions(toUser({ ...row, name: data.name || data.email }));
    if (data.picture) user.picture = data.picture;
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Sign-in failed. Please try again.' });
  }
});

/** POST /api/auth/change-password — require auth; body: oldPassword, newPassword. Updates password_hash and sets must_change_password = false. */
app.post('/api/auth/change-password', optionalAuth, requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  try {
    const r = await pool.query('SELECT password_hash FROM app_users WHERE id = $1', [req.user.id]);
    const row = r.rows[0];
    if (!row?.password_hash) {
      return res.status(400).json({ error: 'Cannot change password for this account.' });
    }
    const match = await bcrypt.compare(oldPassword, row.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE app_users SET password_hash = $1, must_change_password = false WHERE id = $2",
      [hash, req.user.id]
    );
    const updated = withPermissions({ ...toUser(req.user), must_change_password: false });
    res.json({ user: updated });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

/** POST /api/auth/complete-profile — require auth; body: email, first_name, last_name, student_number, password, etc. Updates app_users and sets must_complete_profile = false. */
app.post('/api/auth/complete-profile', optionalAuth, requireAuth, async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email !== req.user.email) {
    return res.status(403).json({ error: 'Cannot update another user\'s profile.' });
  }
  const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const last_name = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const student_number = typeof body.student_number === 'string' ? body.student_number.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!first_name || !last_name || !student_number) {
    return res.status(400).json({ error: 'First name, last name, and student number are required.' });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE app_users SET
        first_name = $1, middle_name = $2, last_name = $3, student_number = $4,
        college = $5, major = $6, phone = $7, password_hash = $8, must_complete_profile = false
        WHERE id = $9`,
      [
        first_name,
        body.middle_name ? String(body.middle_name).trim() : null,
        last_name,
        student_number,
        body.college ? String(body.college).trim() : null,
        body.major ? String(body.major).trim() : null,
        body.phone ? String(body.phone).trim() : null,
        hash,
        req.user.id,
      ]
    );
    const r = await pool.query(
      'SELECT id, email, role, created_at, college_id, community_id, first_name, last_name, must_change_password, must_complete_profile FROM app_users WHERE id = $1',
      [req.user.id]
    );
    const user = withPermissions(toUser(r.rows[0]));
    res.json({ user });
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'Student number is already in use.' });
    console.error('Complete profile error:', err);
    res.status(500).json({ error: 'Could not save profile. Please try again.' });
  }
});

// ---------- Data API (all from DB) ----------

/** GET /api/colleges */
app.get('/api/colleges', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name FROM colleges ORDER BY id');
    res.json(r.rows);
  } catch (err) {
    console.error('colleges list error:', err);
    res.status(500).json({ error: 'Failed to load colleges' });
  }
});

/** GET /api/communities — list communities. Dean: only their college's; Supervisor: only their one community; Admin/unauthenticated: all (or ?college_id= filter). */
app.get('/api/communities', optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const collegeId = req.query.college_id != null ? req.query.college_id : (user?.role === 'dean' && user?.college_id != null ? String(user.college_id) : null);

    if (user?.role === 'supervisor' && user?.community_id != null) {
      const r = await pool.query(
        'SELECT c.id, c.name, c.college_id AS "collegeId", col.name AS "collegeName" FROM communities c JOIN colleges col ON col.id = c.college_id WHERE c.id = $1',
        [user.community_id]
      );
      return res.json(r.rows.length ? [r.rows[0]] : []);
    }

    let q = 'SELECT c.id, c.name, c.college_id AS "collegeId", col.name AS "collegeName" FROM communities c JOIN colleges col ON col.id = c.college_id WHERE 1=1';
    const params = [];
    if (collegeId) {
      params.push(collegeId);
      q += ` AND c.college_id = $${params.length}`;
    }
    q += ' ORDER BY col.name, c.name';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error('communities list error:', err);
    res.status(500).json({ error: 'Failed to load communities' });
  }
});

/** POST /api/communities — admin only. Body: { name, collegeId }. */
app.post('/api/communities', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, collegeId } = req.body || {};
    if (!name || collegeId == null) return res.status(400).json({ error: 'name and collegeId are required' });
    const r = await pool.query(
      'INSERT INTO communities (name, college_id) VALUES ($1, $2) RETURNING id, name, college_id AS "collegeId"',
      [String(name).trim(), Number(collegeId)]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err?.code === '23503') return res.status(400).json({ error: 'Invalid college' });
    if (err?.code === '23505') return res.status(409).json({ error: 'A community with this name already exists in this college' });
    console.error('communities create error:', err);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

/** GET /api/majors?collegeId= (optional) */
app.get('/api/majors', async (req, res) => {
  try {
    const collegeId = req.query.collegeId;
    const q = collegeId
      ? 'SELECT id, name, college_id AS "collegeId" FROM majors WHERE college_id = $1 ORDER BY name'
      : 'SELECT id, name, college_id AS "collegeId" FROM majors ORDER BY college_id, name';
    const r = collegeId ? await pool.query(q, [collegeId]) : await pool.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error('majors list error:', err);
    res.status(500).json({ error: 'Failed to load majors' });
  }
});

/** GET /api/majors/:id — single major by id (for MajorDetails page). */
async function getMajorById(req, res) {
  try {
    const id = req.params.id;
    const r = await pool.query(
      'SELECT m.id, m.name, m.college_id AS "collegeId", c.name AS "collegeName", c.name AS "college_short_name" FROM majors m LEFT JOIN colleges c ON c.id = m.college_id WHERE m.id = $1',
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Major not found' });
    const row = r.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      college_id: row.collegeId,
      college_name: row.collegeName,
      college_short_name: row.college_short_name,
      required_gpa: null,
      high_school_track: null,
      degree_type: null,
      duration: null,
      description: null,
      about_text: null,
      image_url: null,
    });
  } catch (err) {
    console.error('major get error:', err);
    res.status(500).json({ error: 'Failed to load major' });
  }
}
app.get('/api/majors/:id', getMajorById);
/** GET /api/programs/:id — alias for MajorDetails page. */
app.get('/api/programs/:id', getMajorById);

/** GET /api/events — public list (approved + seed upcoming/past). Optional ?status=approved. */
app.get('/api/events', optionalAuth, async (req, res) => {
  try {
    const status = req.query.status;
    let q = 'SELECT id, title, description, category, image, club_name AS "clubName", location, start_date AS "startDate", start_time AS "startTime", end_date AS "endDate", end_time AS "endTime", available_seats AS "availableSeats", price, price_member AS "priceMember", featured, status, feedback, approval_step AS "approvalStep", custom_sections AS "customSections", created_at AS "createdAt" FROM events WHERE 1=1';
    const params = [];
    if (status) {
      params.push(status);
      q += ` AND status = $${params.length}`;
    } else {
      q += " AND (status IN ('approved', 'upcoming', 'past') OR status IS NULL)";
    }
    q += ' ORDER BY start_date DESC NULLS LAST, created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error('events list error:', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

/** GET /api/events/:id */
app.get('/api/events/:id', optionalAuth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, title, description, category, image, club_name AS "clubName", location, start_date AS "startDate", start_time AS "startTime", end_date AS "endDate", end_time AS "endTime", available_seats AS "availableSeats", price, price_member AS "priceMember", featured, status, feedback, approval_step AS "approvalStep", custom_sections AS "customSections", created_at AS "createdAt" FROM events WHERE id = $1',
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('event get error:', err);
    res.status(500).json({ error: 'Failed to load event' });
  }
});

// ——— Admin-only routes (requireAdmin): add any new admin feature here and use requireAdmin ———
// POST /api/events, PUT /api/events/:id, PATCH /api/events/:id/approve, PATCH /api/events/:id/reject,
// DELETE /api/events/:id, GET /api/admin/events
/** POST /api/events — admin only. */
app.post('/api/events', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const id = b.id || `ev-${Date.now()}`;
    await pool.query(
      `INSERT INTO events (id, title, description, category, image, club_name, location, start_date, start_time, end_date, end_time, available_seats, price, price_member, featured, status, feedback, approval_step, custom_sections, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())`,
      [
        id,
        b.title || '',
        b.description || '',
        b.category || 'Event',
        b.image || '/event1.jpg',
        b.clubName || 'University',
        b.location || '',
        b.startDate || null,
        b.startTime || null,
        b.endDate || null,
        b.endTime || null,
        b.availableSeats ?? 0,
        b.price ?? 0,
        b.priceMember ?? null,
        Boolean(b.featured),
        b.status || 'pending',
        b.feedback || null,
        b.approvalStep ?? 0,
        JSON.stringify(b.customSections || []),
        req.user.id,
      ]
    );
    const r = await pool.query('SELECT id, title, status, start_date AS "startDate", start_time AS "startTime", created_at AS "createdAt" FROM events WHERE id = $1', [id]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('event create error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/events/:id', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    await pool.query(
      `UPDATE events SET title=$2, description=$3, category=$4, image=$5, club_name=$6, location=$7, start_date=$8, start_time=$9, end_date=$10, end_time=$11, available_seats=$12, price=$13, price_member=$14, featured=$15, status=$16, feedback=$17, approval_step=$18, custom_sections=$19, updated_at=NOW() WHERE id=$1`,
      [
        id,
        b.title ?? '',
        b.description ?? '',
        b.category ?? 'Event',
        b.image ?? '/event1.jpg',
        b.clubName ?? 'University',
        b.location ?? '',
        b.startDate || null,
        b.startTime || null,
        b.endDate || null,
        b.endTime || null,
        b.availableSeats ?? 0,
        b.price ?? 0,
        b.priceMember ?? null,
        Boolean(b.featured),
        b.status ?? 'draft',
        b.feedback ?? null,
        b.approvalStep ?? 0,
        JSON.stringify(b.customSections || []),
      ]
    );
    const r = await pool.query('SELECT id, title, status, start_date AS "startDate", start_time AS "startTime" FROM events WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('event update error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.patch('/api/events/:id/approve', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE events SET status = 'approved', approval_step = 2, updated_at = NOW() WHERE id = $1", [req.params.id]);
    const r = await pool.query('SELECT id, status FROM events WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('event approve error:', err);
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

app.patch('/api/events/:id/reject', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const feedback = (req.body || {}).feedback || null;
    await pool.query('UPDATE events SET status = $2, feedback = $3, updated_at = NOW() WHERE id = $1', [req.params.id, 'rejected', feedback]);
    const r = await pool.query('SELECT id, status FROM events WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('event reject error:', err);
    res.status(500).json({ error: 'Failed to reject event' });
  }
});

app.delete('/api/events/:id', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    console.error('event delete error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/** GET /api/event-registrations — current user's registrations. */
app.get('/api/event-registrations', optionalAuth, requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT er.id, er.event_id AS "eventId", er.student_id AS "studentId", er.college, er.major, er.created_at AS "createdAt",
       e.title, e.start_date AS "date", e.start_time AS "time", e.image, e.location
       FROM event_registrations er
       LEFT JOIN events e ON e.id = er.event_id
       WHERE er.user_id = $1 ORDER BY er.created_at DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('registrations list error:', err);
    res.status(500).json({ error: 'Failed to load registrations' });
  }
});

/** POST /api/event-registrations — register for an event. */
app.post('/api/event-registrations', optionalAuth, requireAuth, async (req, res) => {
  try {
    const { eventId, studentId, college, major, associationMember, name, email } = req.body || {};
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });
    await pool.query(
      `INSERT INTO event_registrations (user_id, event_id, student_id, college, major, association_member, name, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [req.user.id, eventId, studentId || null, college || null, major || null, associationMember || 'non-member', name || null, email || req.user.email]
    );
    const r = await pool.query(
      'SELECT id, event_id AS "eventId", created_at AS "createdAt" FROM event_registrations WHERE user_id = $1 AND event_id = $2',
      [req.user.id, eventId]
    );
    res.status(201).json(r.rows[0] || { registered: true });
  } catch (err) {
    if (err?.code === '23503') return res.status(404).json({ error: 'Event not found' });
    console.error('registration create error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

/** GET /api/student-profile — current user's profile. */
app.get('/api/student-profile', optionalAuth, requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT college, major, gpa, credits_earned AS "creditsEarned", credits_total AS "creditsTotal", picture FROM student_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (r.rows.length === 0) return res.json({});
    res.json(r.rows[0]);
  } catch (err) {
    console.error('profile get error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

/** PUT /api/student-profile — upsert current user's profile. */
app.put('/api/student-profile', optionalAuth, requireAuth, async (req, res) => {
  try {
    const b = req.body || {};
    await pool.query(
      `INSERT INTO student_profiles (user_id, college, major, gpa, credits_earned, credits_total, picture, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         college=COALESCE(EXCLUDED.college, student_profiles.college),
         major=COALESCE(EXCLUDED.major, student_profiles.major),
         gpa=COALESCE(EXCLUDED.gpa, student_profiles.gpa),
         credits_earned=COALESCE(EXCLUDED.credits_earned, student_profiles.credits_earned),
         credits_total=COALESCE(EXCLUDED.credits_total, student_profiles.credits_total),
         picture=COALESCE(EXCLUDED.picture, student_profiles.picture),
         updated_at=NOW()`,
      [req.user.id, b.college || null, b.major || null, b.gpa ?? null, b.creditsEarned ?? null, b.creditsTotal ?? null, b.picture || null]
    );
    const r = await pool.query('SELECT college, major, gpa, credits_earned AS "creditsEarned", credits_total AS "creditsTotal", picture FROM student_profiles WHERE user_id = $1', [req.user.id]);
    res.json(r.rows[0] || {});
  } catch (err) {
    console.error('profile put error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

/** GET /api/notifications — current user's notifications. */
app.get('/api/notifications', optionalAuth, requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, title, message, read, created_at AS "createdAt" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('notifications list error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

/** PATCH /api/notifications/:id/read */
app.patch('/api/notifications/:id/read', optionalAuth, requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/** POST /api/notifications — create (e.g. welcome); ensure one welcome per user. */
app.post('/api/notifications', optionalAuth, requireAuth, async (req, res) => {
  try {
    const { title, message } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const existing = await pool.query("SELECT 1 FROM notifications WHERE user_id = $1 AND title = 'Welcome' LIMIT 1", [req.user.id]);
    if (existing.rows.length > 0) return res.json({ created: false });
    const r = await pool.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3) RETURNING id, title, message, read, created_at AS "createdAt"',
      [req.user.id, title || 'Welcome', message || '']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('notification create error:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/** GET /api/admin/events — list all events for admin (full rows, any status). */
app.get('/api/admin/events', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, title, description, category, image, club_name AS "clubName", location, start_date AS "startDate", start_time AS "startTime", end_date AS "endDate", end_time AS "endTime", available_seats AS "availableSeats", price, price_member AS "priceMember", featured, status, feedback, approval_step AS "approvalStep", custom_sections AS "customSections", created_at AS "createdAt" FROM events ORDER BY created_at DESC'
    );
    res.json(r.rows);
  } catch (err) {
    console.error('admin events error:', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

/** GET /api/admin/users — list users (optional ?role=dean|supervisor). For assigning dean to college / supervisor to community. */
app.get('/api/admin/users', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const role = req.query.role;
    let q = 'SELECT u.id, u.email, u.role, u.college_id AS "collegeId", u.community_id AS "communityId", c.name AS "collegeName", co.name AS "communityName" FROM app_users u LEFT JOIN colleges c ON c.id = u.college_id LEFT JOIN communities co ON co.id = u.community_id WHERE 1=1';
    const params = [];
    if (role) {
      params.push(role);
      q += ` AND u.role = $${params.length}`;
    }
    q += ' ORDER BY u.role, u.email';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error('admin users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

/** PATCH /api/admin/users/:id/assign-college — assign dean to a college (one dean per college). */
app.patch('/api/admin/users/:id/assign-college', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { collegeId } = req.body || {};
    if (collegeId == null) return res.status(400).json({ error: 'collegeId is required' });
    const userCheck = await pool.query('SELECT id, role FROM app_users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (userCheck.rows[0].role !== 'dean') return res.status(400).json({ error: 'User must have role dean' });
    await pool.query('UPDATE app_users SET college_id = $1 WHERE id = $2', [Number(collegeId), userId]);
    const r = await pool.query('SELECT id, email, role, college_id AS "collegeId" FROM app_users WHERE id = $1', [userId]);
    res.json(r.rows[0]);
  } catch (err) {
    if (err?.code === '23503') return res.status(400).json({ error: 'Invalid college' });
    if (err?.code === '23505') return res.status(409).json({ error: 'This college already has a dean assigned' });
    console.error('assign college error:', err);
    res.status(500).json({ error: 'Failed to assign college' });
  }
});

/** PATCH /api/admin/users/:id/assign-community — assign supervisor to a community (one supervisor per community). */
app.patch('/api/admin/users/:id/assign-community', optionalAuth, requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { communityId } = req.body || {};
    if (communityId == null) return res.status(400).json({ error: 'communityId is required' });
    const userCheck = await pool.query('SELECT id, role FROM app_users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (userCheck.rows[0].role !== 'supervisor') return res.status(400).json({ error: 'User must have role supervisor' });
    await pool.query('UPDATE app_users SET community_id = $1 WHERE id = $2', [Number(communityId), userId]);
    const r = await pool.query('SELECT id, email, role, community_id AS "communityId" FROM app_users WHERE id = $1', [userId]);
    res.json(r.rows[0]);
  } catch (err) {
    if (err?.code === '23503') return res.status(400).json({ error: 'Invalid community' });
    if (err?.code === '23505') return res.status(409).json({ error: 'This community already has a supervisor assigned' });
    console.error('assign community error:', err);
    res.status(500).json({ error: 'Failed to assign community' });
  }
});

const server = app.listen(PORT, async () => {
  const adminOk = await ensureAdminUser();
  if (!adminOk) {
    console.warn('Admin user not in DB yet. Run "npm run migrate" then restart, or log in with admin@najah.edu to create it.');
  }
  console.log(`Backend server at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT in .env (e.g. PORT=3001).`);
    process.exit(1);
  }
  throw err;
});
