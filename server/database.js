const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// In-memory database with JSON persistence
class Database {
  constructor() {
    this.data = {
      users: [],
      jobs: [],
      applications: []
    };
    this.dataFile = path.join(__dirname, 'data.json');
    this.initialize();
  }

  // Initialize database with sample data
  initialize() {
    // Try to load from file first
    this.loadFromFile();
    
    // If no data or empty, create sample data
    if (this.data.users.length === 0) {
      this.createSampleData();
    }
    
    // Save to file for persistence
    this.saveToFile();
  }

  // Load data from JSON file
  loadFromFile() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileData = fs.readFileSync(this.dataFile, 'utf8');
        this.data = JSON.parse(fileData);
        console.log('📁 Database loaded from file');
      }
    } catch (error) {
      console.log('📝 No existing data file, starting fresh');
    }
  }

  // Save data to JSON file
  saveToFile() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
      console.log('💾 Database saved to file');
    } catch (error) {
      console.log('❌ Error saving to file:', error.message);
    }
  }

  // Create sample data
  async createSampleData() {
    console.log('🚀 Creating sample data...');

    // Create sample users
    const sampleUsers = [
      {
        id: 1,
        name: 'Rahul Kumar',
        email: 'rahul@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'worker',
        phone: '9876543210',
        education: '12th Pass',
        skills: 'Computer Basics, Data Entry',
        experience: 'Fresher',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'recruiter',
        phone: '9876543211',
        company: 'Tech Solutions Pvt Ltd',
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Amit Singh',
        email: 'amit@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'worker',
        phone: '9876543212',
        education: '10th Pass',
        skills: 'Driving, Delivery',
        experience: '2 years',
        created_at: new Date().toISOString()
      }
    ];

    // Create sample jobs
    const sampleJobs = [
      {
        id: 1,
        title: 'Data Entry Operator',
        company: 'Tech Solutions Pvt Ltd',
        description: 'Looking for a data entry operator with basic computer knowledge. Must be able to type quickly and accurately.',
        requirements: 'Basic computer skills, 10th pass, good typing speed',
        salary: '₹15,000 - ₹20,000 per month',
        location: 'Delhi',
        education: '10th Pass',
        job_type: 'Full Time',
        category: 'Data Entry',
        status: 'active',
        posted_by: 2,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Delivery Boy',
        company: 'Quick Delivery Services',
        description: 'Urgent requirement for delivery boys. Must have own bike and valid driving license.',
        requirements: 'Valid driving license, know local area, hardworking',
        salary: '₹12,000 - ₹18,000 per month',
        location: 'Mumbai',
        education: '8th Pass',
        job_type: 'Full Time',
        category: 'Delivery',
        status: 'active',
        posted_by: 2,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        title: 'Office Assistant',
        company: 'Business Solutions',
        description: 'Need an office assistant for daily administrative tasks. Good communication skills required.',
        requirements: '12th pass, basic computer knowledge, good communication',
        salary: '₹18,000 - ₹25,000 per month',
        location: 'Bangalore',
        education: '12th Pass',
        job_type: 'Full Time',
        category: 'Office Work',
        status: 'active',
        posted_by: 2,
        created_at: new Date().toISOString()
      }
    ];

    // Create sample applications
    const sampleApplications = [
      {
        id: 1,
        job_id: 1,
        user_id: 1,
        status: 'pending',
        applied_at: new Date().toISOString()
      },
      {
        id: 2,
        job_id: 2,
        user_id: 3,
        status: 'pending',
        applied_at: new Date().toISOString()
      }
    ];

    this.data.users = sampleUsers;
    this.data.jobs = sampleJobs;
    this.data.applications = sampleApplications;

    console.log('✅ Sample data created successfully!');
    console.log(`   - ${sampleUsers.length} users`);
    console.log(`   - ${sampleJobs.length} jobs`);
    console.log(`   - ${sampleApplications.length} applications`);
  }

  // User operations
  async createUser(userData) {
    const newUser = {
      id: this.data.users.length + 1,
      ...userData,
      password: await bcrypt.hash(userData.password, 10),
      created_at: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.saveToFile();
    return newUser;
  }

  async findUserByEmail(email) {
    return this.data.users.find(user => user.email === email);
  }

  async findUserById(id) {
    return this.data.users.find(user => user.id === parseInt(id));
  }

  async validateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  // Job operations
  async createJob(jobData) {
    const newJob = {
      id: this.data.jobs.length + 1,
      ...jobData,
      created_at: new Date().toISOString()
    };
    this.data.jobs.push(newJob);
    this.saveToFile();
    return newJob;
  }

  async getJobs(filters = {}) {
    let jobs = [...this.data.jobs];
    
    // Apply filters
    if (filters.q) {
      const searchTerm = filters.q.toLowerCase();
      jobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.company.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.location) {
      jobs = jobs.filter(job => 
        job.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    if (filters.education) {
      jobs = jobs.filter(job => 
        job.education.toLowerCase().includes(filters.education.toLowerCase())
      );
    }
    
    if (filters.category) {
      jobs = jobs.filter(job => 
        job.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }
    
    if (filters.created_by) {
      jobs = jobs.filter(job => job.posted_by === parseInt(filters.created_by));
    }
    
    return jobs;
  }

  async getJobById(id) {
    return this.data.jobs.find(job => job.id === parseInt(id));
  }

  async updateJob(id, updateData) {
    const index = this.data.jobs.findIndex(job => job.id === parseInt(id));
    if (index !== -1) {
      this.data.jobs[index] = { ...this.data.jobs[index], ...updateData };
      this.saveToFile();
      return this.data.jobs[index];
    }
    return null;
  }

  async deleteJob(id) {
    const index = this.data.jobs.findIndex(job => job.id === parseInt(id));
    if (index !== -1) {
      const deletedJob = this.data.jobs.splice(index, 1)[0];
      this.saveToFile();
      return deletedJob;
    }
    return null;
  }

  // Application operations
  async createApplication(applicationData) {
    const newApplication = {
      id: this.data.applications.length + 1,
      ...applicationData,
      applied_at: new Date().toISOString()
    };
    this.data.applications.push(newApplication);
    this.saveToFile();
    return newApplication;
  }

  async getApplications(filters = {}) {
    let applications = [...this.data.applications];
    
    if (filters.job_id) {
      applications = applications.filter(app => app.job_id === parseInt(filters.job_id));
    }
    
    if (filters.user_id) {
      applications = applications.filter(app => app.user_id === parseInt(filters.user_id));
    }
    
    return applications;
  }

  async updateApplication(id, updateData) {
    const index = this.data.applications.findIndex(app => app.id === parseInt(id));
    if (index !== -1) {
      this.data.applications[index] = { ...this.data.applications[index], ...updateData };
      this.saveToFile();
      return this.data.applications[index];
    }
    return null;
  }

  // Get database statistics
  getStats() {
    return {
      totalUsers: this.data.users.length,
      totalJobs: this.data.jobs.length,
      totalApplications: this.data.applications.length,
      activeJobs: this.data.jobs.filter(job => job.status === 'active').length,
      pendingApplications: this.data.applications.filter(app => app.status === 'pending').length
    };
  }

  // Reset database (for testing)
  reset() {
    this.data = {
      users: [],
      jobs: [],
      applications: []
    };
    this.createSampleData();
    this.saveToFile();
  }
}

module.exports = new Database();
