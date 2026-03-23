require('dotenv').config();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
const helmet = require("helmet");
const passport = require("passport");
const nodemailer = require("nodemailer");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const bcrypt = require("bcrypt");
const fs = require("fs");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
const DATA_DIR = ".";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const POSTS_FILE = DATA_DIR + "/posts.json";
const SLIDER_FILE = DATA_DIR + "/sliders.json";
const ORDERS_FILE = DATA_DIR + "/orders.json";
const USERS_FILE = DATA_DIR + "/users.json";

const REVIEWS_FILE = DATA_DIR + "/reviews.json";
const WISHLIST_FILE = DATA_DIR + "/wishlist.json";
const NEWSLETTER_FILE = DATA_DIR + "/newsletter.json";
const CONTACT_FILE = DATA_DIR + "/contacts.json";
const CATEGORIES_FILE = DATA_DIR + "/categories.json";

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

// ===== INLINE CSS =====
// Paste your entire style.css content here (the one you provided)
const styleCss = `
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        background: #f8f9fc;
        color: #1a1a1a;
        line-height: 1.5;
    }
    /* ... (all your CSS rules) ... */
    /* Make sure to include the complete CSS content from style (1).css */
</style>
`;

// Serve the CSS from an inline route (guarantees it's always available)
app.get('/css/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(styleCss);
});

// ===== PASSPORT CONFIGURATION =====
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://sportsindacompany.com/auth/google/callback"
},
(accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// ===== MIDDLEWARE =====
const multer = require("multer");
const session = require("express-session");
const path = require("path");
const rateLimit = require("express-rate-limit");
app.use(helmet());
app.set('trust proxy', 1);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later."
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(passport.initialize());
app.use(passport.session());

// Static files (uploaded images, etc.)
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

// ===== HELPER FUNCTIONS =====
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function loadSliders() {
  return JSON.parse(fs.readFileSync(SLIDER_FILE, "utf8"));
}

function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function loadPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  const posts = JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
  let changed = false;
  const fixed = posts.map(p => {
    if (!p.category) {
      changed = true;
      return { ...p, category: "General" };
    }
    return p;
  });
  if (changed) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(fixed, null, 2));
  }
  return fixed;
}

function getCategories(posts) {
  return [...new Set(posts.map(p => p.category))];
}

function loadReviews() {
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function loadWishlist() {
  try {
    return JSON.parse(fs.readFileSync(WISHLIST_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function loadCategories() {
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function saveCategories(categories) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// ... (all other helper functions like getAdminHeader, getHeader, getFooter, etc. remain the same)
// Make sure all async password checks use await (see examples below)

// ===== FIXED AUTHENTICATION ROUTES =====

// User Login POST (fixed await)
app.post("/login-user", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.redirect("/login-user?error=Email and password are required");
  }
  const users = loadUsers();
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.redirect("/login-user?error=Invalid email or password");
  }
  if (user.lockUntil && user.lockUntil > Date.now()) {
    return res.send("Account locked. Try again later");
  }
  // Await the password comparison
  const match = await comparePassword(password, user.password);
  if (!match) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000;
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return res.redirect("/login-user?error=Invalid email or password");
  }
  user.loginAttempts = 0;
  user.lockUntil = null;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  req.session.userId = user.id;
  req.session.loggedIn = true;
  res.redirect("/profile");
});

// Change Password POST (fixed await)
app.post("/change-password", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === req.session.userId);
  if (userIndex === -1) return res.redirect("/profile");
  const { currentPassword, newPassword } = req.body;
  const match = await comparePassword(currentPassword, users[userIndex].password);
  if (!match) {
    return res.redirect("/change-password?error=Current password is incorrect");
  }
  users[userIndex].password = await hashPassword(newPassword);
  users[userIndex].updatedAt = new Date().toISOString();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.redirect("/profile?success=Password updated successfully");
});

// Admin Login POST (fixed compare)
app.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "Vivek@2026Secure";
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    req.session.userName = "Admin";
    req.session.userId = 1;
    req.session.role = "admin";
    return res.redirect("/admin");
  }
  const users = loadUsers();
  const user = users.find(u =>
    (u.email === username || u.name === username) &&
    (u.role === 'admin' || u.isAdmin)
  );
  if (user && await comparePassword(password, user.password)) {
    req.session.loggedIn = true;
    req.session.userName = user.name;
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.role = user.role || 'user';
    return res.redirect("/admin");
  }
  res.redirect("/login?error=Invalid username or password");
});

// Register POST (with captcha and OTP)
app.post("/register", async (req, res) => {
  // ... (keep your existing registration logic, but ensure await for captcha verification)
  // No password comparison needed here, just captcha and email OTP.
});

// ... (all other routes remain the same, but ensure any call to comparePassword/hashPassword uses await)

// ===== SERVE THE CSS ROUTE =====
// Already done at the top.

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ CSS served inline at /css/style.css`);
  console.log(`📝 Admin login: admin / Vivek@2026Secure`);
});
