// app.js - Backend + Auth helpers
// ===============================

// If your folder name is different, change this one line only:
const BASE = "";

const API = (file) => `${BASE}/backend/${file}`;

// Security enhancements
const SECURITY = {
  // Rate limiting
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    attempts: {}
  },
  
  // Session management
  session: {
    timeout: 3600000, // 1 hour in milliseconds
    refreshThreshold: 300000 // 5 minutes before expiry
  },
  
  // Input validation patterns
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[+]?[0-9]{10,15}$/,
    name: /^[a-zA-Z\s]{2,50}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  }
};

// Enhanced security functions
function validateInput(input, type) {
  const pattern = SECURITY.patterns[type];
  return pattern ? pattern.test(input) : false;
}

function sanitizeInput(input) {
  return String(input || '')
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 500); // Limit length
}

function checkRateLimit(identifier) {
  const now = Date.now();
  const window = SECURITY.rateLimit.windowMs;
  const maxRequests = SECURITY.rateLimit.maxRequests;
  
  if (!SECURITY.rateLimit.attempts[identifier]) {
    SECURITY.rateLimit.attempts[identifier] = [];
  }
  
  // Clean old attempts
  SECURITY.rateLimit.attempts[identifier] = SECURITY.rateLimit.attempts[identifier].filter(
    timestamp => now - timestamp < window
  );
  
  // Check if under limit
  if (SECURITY.rateLimit.attempts[identifier].length >= maxRequests) {
    return false;
  }
  
  // Add current attempt
  SECURITY.rateLimit.attempts[identifier].push(now);
  return true;
}

function isSessionValid() {
  const user = getUser();
  if (!user) return false;
  
  const lastActivity = localStorage.getItem('lastActivity');
  if (!lastActivity) return true;
  
  const timeSinceActivity = Date.now() - parseInt(lastActivity);
  return timeSinceActivity < SECURITY.session.timeout;
}

function updateSessionActivity() {
  localStorage.setItem('lastActivity', Date.now().toString());
}

// XSS Protection
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
}

function roleKey(role){
  return role==="worker"?"failjob_user_worker":(role==="recruiter"?"failjob_user_recruiter":"failjob_user")
}
function pathRole(){
  const p=(location.pathname||"").toLowerCase();
  if(p.indexOf("/worker/")!==-1)return"worker";
  if(p.indexOf("/recruiter/")!==-1)return"recruiter";
  return null
}
function setUser(user){
  try{
    localStorage.setItem("failjob_user",JSON.stringify(user));
    const k=roleKey(user&&user.role);
    if(k)localStorage.setItem(k,JSON.stringify(user))
  }catch(e){}
}
function getUser(){
  try{
    const r=pathRole();
    if(r){
      const rk=roleKey(r);
      const v=localStorage.getItem(rk);
      if(v)return JSON.parse(v);
      const d=localStorage.getItem("failjob_user");
      if(!d)return null;
      const obj=JSON.parse(d);
      if(obj&&obj.role===r){
        localStorage.setItem(rk,JSON.stringify(obj));
        return obj
      }
    }
    return null
  }catch(e){
    console.error('Error getting user:', e);
    return null
  }
}
function clearUser(){
  try{
    const r=pathRole();
    if(r)localStorage.removeItem(roleKey(r));
    localStorage.removeItem("failjob_user")
  }catch(e){}
}
function logout(){
  try{
    const r=pathRole();
    if(r)localStorage.removeItem(roleKey(r));
    localStorage.removeItem("failjob_user")
  }catch(e){
    console.error('Logout error:', e);
  }
  alert("Logged out successfully ✅");
  window.location.href="../index.html"
}

// ---- Role guards ----
function requireLogin(redirectTo = "index.html") {
  const u = getUser();
  if (!u) {
    alert("Please login first.");
    window.location.href = `login.html?redirect=${encodeURIComponent(redirectTo)}`;
    return null;
  }
  return u;
}

function requireEmployer(redirectTo = "post-job.html") {
  const u = requireLogin(redirectTo);
  if (!u) return null;

  if (u.role !== "employer" && u.role !== "recruiter") {
    alert("Only employers/recruiters can post jobs. Please login as Employer or Recruiter.");
    window.location.href = `login.html?redirect=${encodeURIComponent(redirectTo)}`;
    return null;
  }
  return u;
}

function requireRecruiter(redirectTo = "dashboard.html") {
  const u = requireLogin(redirectTo);
  if (!u) return null;

  if (u.role !== "recruiter") {
    alert("Only recruiters can access this page. Please login as Recruiter.");
    window.location.href = `login.html?redirect=${encodeURIComponent(redirectTo)}`;
    return null;
  }
  return u;
}

// ---- Small fetch helper ----
async function postJSON(endpoint, payload) {
  const res = await fetch(API(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // if PHP prints warnings, it may break JSON. This helps debugging.
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Invalid JSON from server:", text);
    return { ok: false, message: "Server returned invalid response. Check PHP errors." };
  }
}
