import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

function getPool() {
  const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
  const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.DB_PASS || process.env.MYSQLPASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'failjob_db';
  const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
  return mysql.createPool({ host, user, password, database, port, waitForConnections: true, connectionLimit: 10 });
}

const pool = getPool();

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  next();
});

// GET /backend/jobs_list.php
app.get('/backend/jobs_list.php', async (req, res) => {
  try {
    const { q = '', location = '', education = '', category = '', created_by = 0 } = req.query;
    let sql = `SELECT id, title, company, location, salary, education, job_type, category, status, created_by, created_at
               FROM jobs WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (title LIKE ? OR company LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (location) {
      sql += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    if (education) {
      sql += ' AND education LIKE ?';
      params.push(`%${education}%`);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (Number(created_by) > 0) {
      sql += ' AND created_by = ?';
      params.push(Number(created_by));
    }
    sql += ' ORDER BY id DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ ok: true, jobs: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// GET /backend/job_get.php?id=...
app.get('/backend/job_get.php', async (req, res) => {
  try {
    const id = Number(req.query.id || 0);
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json({ ok: true, job: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// GET /backend/applications_list.php?job_id=&recruiter_id=
app.get('/backend/applications_list.php', async (req, res) => {
  try {
    const job_id = Number(req.query.job_id || 0);
    const recruiter_id = Number(req.query.recruiter_id || 0);
    if (job_id <= 0) return res.status(400).json({ ok: false, message: 'Invalid job id' });

    if (recruiter_id > 0) {
      const [chk] = await pool.query('SELECT id FROM jobs WHERE id = ? AND created_by = ? LIMIT 1', [job_id, recruiter_id]);
      if (!chk.length) return res.status(403).json({ ok: false, message: 'Access denied' });
    }

    const [apps] = await pool.query(
      `SELECT id, job_id, applicant_name, applicant_phone, applicant_email, message, created_at
       FROM applications WHERE job_id = ? ORDER BY id DESC`, [job_id]
    );
    res.json({ ok: true, applications: apps });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// POST /backend/jobs_status.php
app.post('/backend/jobs_status.php', async (req, res) => {
  try {
    const { job_id = 0, recruiter_id = 0, status = '' } = req.body || {};
    if (!job_id || !recruiter_id || !['expired', 'closed', 'active'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'Invalid request' });
    }
    const [chk] = await pool.query('SELECT id FROM jobs WHERE id = ? AND created_by = ? LIMIT 1', [job_id, recruiter_id]);
    if (!chk.length) return res.status(403).json({ ok: false, message: 'Job not found or access denied' });

    const [r] = await pool.query('UPDATE jobs SET status = ? WHERE id = ? AND created_by = ?', [status, job_id, recruiter_id]);
    if (r.affectedRows) res.json({ ok: true, message: `Job marked as ${status} successfully` });
    else res.status(500).json({ ok: false, message: 'Failed to update job status' });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// POST /backend/jobs_delete.php
app.post('/backend/jobs_delete.php', async (req, res) => {
  try {
    const { job_id = 0, recruiter_id = 0 } = req.body || {};
    if (!job_id || !recruiter_id) return res.status(400).json({ ok: false, message: 'Invalid request' });

    const [chk] = await pool.query('SELECT id FROM jobs WHERE id = ? AND created_by = ? LIMIT 1', [job_id, recruiter_id]);
    if (!chk.length) return res.status(403).json({ ok: false, message: 'Job not found or access denied' });

    const [r] = await pool.query('DELETE FROM jobs WHERE id = ? AND created_by = ?', [job_id, recruiter_id]);
    if (r.affectedRows) res.json({ ok: true, message: 'Job deleted successfully' });
    else res.status(500).json({ ok: false, message: 'Failed to delete job' });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// POST /backend/apply_create.php
app.post('/backend/apply_create.php', async (req, res) => {
  try {
    const { job_id = 0, applicant_name = '', applicant_phone = '', applicant_email = '', message = '' } = req.body || {};
    const jobId = Number(job_id);
    if (!jobId || !applicant_name || !applicant_phone) {
      return res.status(400).json({ ok: false, message: 'Job, name, phone required' });
    }
    const [jobRows] = await pool.query('SELECT id, created_by, status FROM jobs WHERE id = ? LIMIT 1', [jobId]);
    if (!jobRows.length) return res.status(404).json({ ok: false, message: 'Job not found' });
    const jr = jobRows[0];
    if (jr.status && ['closed', 'expired'].includes(jr.status)) {
      return res.status(400).json({ ok: false, message: 'This job is not accepting applications' });
    }

    const [dup] = await pool.query('SELECT id FROM applications WHERE job_id = ? AND applicant_phone = ? LIMIT 1', [jobId, applicant_phone]);
    if (dup.length) return res.status(409).json({ ok: false, message: 'Already applied with this phone' });

    await pool.query(
      `INSERT INTO applications (job_id, applicant_name, applicant_phone, applicant_email, message, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [jobId, applicant_name, applicant_phone, applicant_email || '', message || '']
    );
    res.json({ ok: true, message: 'Application submitted' });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// POST /backend/auth_register.php
app.post('/backend/auth_register.php', async (req, res) => {
  try {
    const { name = '', email = '', password = '', role = 'jobseeker' } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'All fields are required' });
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashed, role]);
    res.json({ ok: true, message: 'Registered' });
  } catch (e) {
    // likely duplicate
    res.status(400).json({ ok: false, message: 'Email already exists' });
  }
});

// POST /backend/auth_login.php
app.post('/backend/auth_login.php', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};
    const [rows] = await pool.query('SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) return res.status(401).json({ ok: false, message: 'Invalid login' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, message: 'Invalid login' });

    if (user.role === 'employer') user.role = 'recruiter';
    if (user.role === 'jobseeker') user.role = 'worker';
    delete user.password;
    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Database error: ' + e.message });
  }
});

// Serve static files (frontend) from project root
app.use(express.static(ROOT));

// Fallback to index.html for non-API routes
app.get('*', (req, res) => {
  res.type('text/html');
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

