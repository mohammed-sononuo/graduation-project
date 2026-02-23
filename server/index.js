import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/Graduation%20Project',
});

const ALLOWED_DOMAINS = ['@stu.najah.edu', '@najah.edu'];

function isValidNajahEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_DOMAINS.some((d) => normalized.endsWith(d.toLowerCase()));
}

async function ensureAdminUser() {
  const client = await pool.connect();
  try {
    const adminEmail = 'admin@najah.edu';
    const hash = await bcrypt.hash('1234', 10);
    const r = await client.query('SELECT 1 FROM app_users WHERE email = $1 LIMIT 1', [adminEmail]);
    if (r.rows.length === 0) {
      const old = await client.query("SELECT 1 FROM app_users WHERE email = 'admin' LIMIT 1");
      if (old.rows.length > 0) {
        await client.query(
          "UPDATE app_users SET email = $1, password_hash = $2 WHERE email = 'admin'",
          [adminEmail, hash]
        );
        console.log('Admin user updated to admin@najah.edu with password 1234.');
      } else {
        await client.query(
          "INSERT INTO app_users (email, password_hash, role) VALUES ($1, $2, 'admin')",
          [adminEmail, hash]
        );
        console.log('Admin user created (email: admin@najah.edu, password: 1234).');
      }
    }
  } finally {
    client.release();
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend running' });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  if (!isValidNajahEmail(emailNorm)) {
    return res.status(400).json({
      error: 'Please use a university email (@stu.najah.edu or @najah.edu).',
    });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }
  try {
    const existing = await pool.query('SELECT 1 FROM app_users WHERE email = $1 LIMIT 1', [emailNorm]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      "INSERT INTO app_users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role",
      [emailNorm, hash]
    );
    const user = r.rows[0];
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.email,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const r = await pool.query(
      'SELECT id, email, password_hash, role FROM app_users WHERE email = $1 LIMIT 1',
      [String(email).trim().toLowerCase()]
    );
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
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
    if (!isValidNajahEmail(email)) {
      return res.status(403).json({
        error: 'Please use a Najah University Google account (@stu.najah.edu or @najah.edu).',
      });
    }
    res.json({
      user: {
        email: data.email,
        name: data.name || data.email,
        picture: data.picture,
        role: 'user',
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Sign-in failed. Please try again.' });
  }
});

app.listen(PORT, async () => {
  try {
    await ensureAdminUser();
  } catch (e) {
    console.error('Could not ensure admin user:', e.message);
  }
  console.log(`Backend server at http://localhost:${PORT}`);
});
