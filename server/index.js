const path = require('path');
const express = require('express');
const database = require('./database');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10mb' })); // Limit request body size

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..')));

// ===== AUTH ENDPOINTS =====

// Register new user
app.post('/backend/auth_register.php', async (req, res) => {
  try {
    const { name, email, password, role, phone, education, skills, experience, company } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Name, email, password, and role are required' 
      });
    }

    // Check if user already exists
    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Email already registered' 
      });
    }

    // Create new user
    const userData = {
      name,
      email,
      password,
      role,
      phone: phone || '',
      education: education || '',
      skills: skills || '',
      experience: experience || '',
      company: company || ''
    };

    const newUser = await database.createUser(userData);
    
    res.json({ 
      ok: true, 
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Registration failed' 
    });
  }
});

// Login user
app.post('/backend/auth_login.php', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Email and password are required' 
      });
    }

    const user = await database.validateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ 
        ok: false, 
        message: 'Invalid email or password' 
      });
    }

    // Normalize role names
    let normalizedRole = user.role;
    if (normalizedRole === 'employer') normalizedRole = 'recruiter';
    if (normalizedRole === 'jobseeker') normalizedRole = 'worker';

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      ok: true, 
      message: 'Login successful',
      user: { ...userWithoutPassword, role: normalizedRole }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Login failed' 
    });
  }
});

// ===== JOB ENDPOINTS =====

// Get all jobs with filters
app.get('/backend/jobs_list.php', async (req, res) => {
  try {
    const { q, location, education, category, created_by } = req.query;
    
    const filters = {};
    if (q) filters.q = q;
    if (location) filters.location = location;
    if (education) filters.education = education;
    if (category) filters.category = category;
    if (created_by) filters.created_by = created_by;

    const jobs = await database.getJobs(filters);
    
    res.json({ ok: true, jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch jobs' 
    });
  }
});

// Get single job
app.get('/backend/job_get.php', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Job ID is required' 
      });
    }

    const job = await database.getJobById(id);
    
    if (!job) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Job not found' 
      });
    }

    res.json({ ok: true, job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch job' 
    });
  }
});

// Create new job
app.post('/backend/jobs_create.php', async (req, res) => {
  try {
    const { title, company, description, requirements, salary, location, education, job_type, category, posted_by } = req.body;
    
    // Validate required fields
    if (!title || !company || !description || !posted_by) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Title, company, description, and posted_by are required' 
      });
    }

    const jobData = {
      title,
      company,
      description,
      requirements: requirements || '',
      salary: salary || '',
      location: location || '',
      education: education || '',
      job_type: job_type || 'Full Time',
      category: category || 'General',
      status: 'active',
      posted_by: parseInt(posted_by)
    };

    const newJob = await database.createJob(jobData);
    
    res.json({ 
      ok: true, 
      message: 'Job created successfully',
      job: newJob
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to create job' 
    });
  }
});

// Update job status
app.post('/backend/jobs_status.php', async (req, res) => {
  try {
    const { id, status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Job ID and status are required' 
      });
    }

    const updatedJob = await database.updateJob(id, { status });
    
    if (!updatedJob) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Job not found' 
      });
    }

    res.json({ 
      ok: true, 
      message: 'Job status updated successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to update job status' 
    });
  }
});

// Delete job
app.post('/backend/jobs_delete.php', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Job ID is required' 
      });
    }

    const deletedJob = await database.deleteJob(id);
    
    if (!deletedJob) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Job not found' 
      });
    }

    res.json({ 
      ok: true, 
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to delete job' 
    });
  }
});

// ===== APPLICATION ENDPOINTS =====

// Create job application
app.post('/backend/apply_create.php', async (req, res) => {
  try {
    const { job_id, user_id, applicant_name, applicant_phone, applicant_email, message } = req.body;
    
    if (!job_id || !user_id) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Job ID and User ID are required' 
      });
    }

    // Check if already applied
    const existingApplications = await database.getApplications({ job_id, user_id });
    if (existingApplications.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        message: 'You have already applied for this job' 
      });
    }

    const applicationData = {
      job_id: parseInt(job_id),
      user_id: parseInt(user_id),
      applicant_name: applicant_name || '',
      applicant_phone: applicant_phone || '',
      applicant_email: applicant_email || '',
      message: message || '',
      status: 'pending'
    };

    const newApplication = await database.createApplication(applicationData);
    
    res.json({ 
      ok: true, 
      message: 'Application submitted successfully',
      application: newApplication
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to submit application' 
    });
  }
});

// Get applications
app.get('/backend/applications_list.php', async (req, res) => {
  try {
    const { job_id, user_id } = req.query;
    
    const filters = {};
    if (job_id) filters.job_id = job_id;
    if (user_id) filters.user_id = user_id;

    const applications = await database.getApplications(filters);
    
    // Get job details for each application
    const applicationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        const job = await database.getJobById(app.job_id);
        const user = await database.findUserById(app.user_id);
        return {
          ...app,
          job: job ? {
            id: job.id,
            title: job.title,
            company: job.company
          } : null,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email
          } : null
        };
      })
    );
    
    res.json({ ok: true, applications: applicationsWithDetails });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch applications' 
    });
  }
});

// ===== UTILITY ENDPOINTS =====

// Get database statistics
app.get('/backend/stats.php', async (req, res) => {
  try {
    const stats = database.getStats();
    res.json({ ok: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// Reset database (for testing)
app.post('/backend/reset.php', async (req, res) => {
  try {
    database.reset();
    res.json({ 
      ok: true, 
      message: 'Database reset successfully' 
    });
  } catch (error) {
    console.error('Reset database error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to reset database' 
    });
  }
});

// ===== DEFAULT ROUTE =====

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ===== START SERVER =====

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('🚀 12th Fail Jobs Server Started!');
  console.log(`📍 Server running on http://${HOST}:${PORT}`);
  console.log('📊 Database initialized with sample data');
  console.log('');
  console.log('👤 Sample Login Accounts:');
  console.log('   Worker: rahul@example.com / password123');
  console.log('   Recruiter: priya@example.com / password123');
  console.log('   Worker: amit@example.com / password123');
  console.log('');
  console.log('🔧 Available Endpoints:');
  console.log('   POST /backend/auth_register.php - Register user');
  console.log('   POST /backend/auth_login.php - Login user');
  console.log('   GET  /backend/jobs_list.php - Get jobs');
  console.log('   GET  /backend/job_get.php - Get single job');
  console.log('   POST /backend/jobs_create.php - Create job');
  console.log('   POST /backend/jobs_status.php - Update job status');
  console.log('   POST /backend/jobs_delete.php - Delete job');
  console.log('   POST /backend/apply_create.php - Apply for job');
  console.log('   GET  /backend/applications_list.php - Get applications');
  console.log('   GET  /backend/stats.php - Get statistics');
  console.log('   POST /backend/reset.php - Reset database');
  console.log('');
});

module.exports = app;

app.post('/backend/auth_register.php', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'jobseeker');
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'All fields are required' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const conn = await pool.getConnection();
    try {
      await conn.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
      res.json({ ok: true, message: 'Registered' });
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ ok: false, message: 'Email already exists' });
      } else {
        res.status(500).json({ ok: false, message: 'Registration failed' });
      }
    } finally {
      conn.release();
    }
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Registration failed' });
  }
});

app.post('/backend/auth_login.php', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const rows = await query('SELECT id, name, email, password, role FROM users WHERE email=? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(401).json({ ok: false, message: 'Invalid login' });
    const user = rows[0];
    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, message: 'Invalid login' });
    let role = user.role;
    if (role === 'employer') role = 'recruiter';
    if (role === 'jobseeker') role = 'worker';
    const { password: _p, ...rest } = user;
    res.json({ ok: true, user: { ...rest, role } });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Login failed' });
  }
});

module.exports = app;

