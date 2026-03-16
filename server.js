require('dotenv').config();

const helmet = require("helmet");

const passport = require("passport");
const nodemailer = require("nodemailer");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

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
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://sportsindacompany.com/auth/google/callback"
},
(accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));



const multer = require("multer"); 
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");
const rateLimit = require("express-rate-limit");
app.use(helmet());
app.set('trust proxy', 1);  // 👈 Add this line
// Basic middleware - no security restrictions


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later."
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-user' }),
  (req, res) => {
    try {

      if (!req.user) {
        return res.redirect('/login-user');
      }
      req.session.loggedIn = true;

const email = req.user.emails?.[0]?.value || "";
let users = loadUsers();

let existingUser = users.find(u => u.email === email);

if (!existingUser) {

  const newUser = {
    id: Date.now().toString(),
    name: req.user.displayName || "Google User",
    email: email,
    phone: "",
    createdAt: new Date().toISOString(),
    provider: "google"
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  existingUser = newUser;
}

req.session.userId = existingUser.id;
req.session.userName = existingUser.name;
req.session.userEmail = existingUser.email;
      

      return res.redirect('/profile');

    } catch (err) {
      console.error("Google callback error:", err);
      return res.redirect('/login-user');
    }
  }
);

// Simple static file serving
app.use("/uploads", express.static("uploads"));

// Simple file upload configuration
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});



// Initialize files if they don't exist
const files = [
  SLIDER_FILE, POSTS_FILE, ORDERS_FILE, USERS_FILE,
  REVIEWS_FILE, WISHLIST_FILE, NEWSLETTER_FILE, CONTACT_FILE
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
  }
});

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

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
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

// Simple password functions (no bcrypt)

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
// Initialize categories file if it doesn't exist
if (!fs.existsSync(CATEGORIES_FILE)) {
  const defaultCategories = [
    {
      id: 1,
      name: "Running",
      slug: "running",
      subcategories: [
        { id: 101, name: "Running Shoes", slug: "running-shoes" },
        { id: 102, name: "Running Shorts", slug: "running-shorts" },
        { id: 103, name: "Running Tops", slug: "running-tops" }
      ]
    },
    {
      id: 2,
      name: "Boxing",
      slug: "boxing",
      subcategories: [
        { id: 201, name: "Boxing Gloves", slug: "boxing-gloves" },
        { id: 202, name: "Hand Wraps", slug: "hand-wraps" },
        { id: 203, name: "Punching Bags", slug: "punching-bags" }
      ]
    },
    {
      id: 3,
      name: "Wrestling",
      slug: "wrestling",
      subcategories: [
        { id: 301, name: "Wrestling Shoes", slug: "wrestling-shoes" },
        { id: 302, name: "Singlets", slug: "singlets" },
        { id: 303, name: "Headgear", slug: "headgear" }
      ]
    },
    {
      id: 4,
      name: "Cricket",
      slug: "cricket",
      subcategories: [
        { id: 401, name: "Cricket Bats", slug: "cricket-bats" },
        { id: 402, name: "Cricket Balls", slug: "cricket-balls" },
        { id: 403, name: "Protective Gear", slug: "protective-gear" }
      ]
    },
    {
      id: 5,
      name: "Football",
      slug: "football",
      subcategories: [
        { id: 501, name: "Football Shoes", slug: "football-shoes" },
        { id: 502, name: "Jerseys", slug: "jerseys" },
        { id: 503, name: "Shin Guards", slug: "shin-guards" }
      ]
    },
    {
      id: 6,
      name: "General",
      slug: "general",
      subcategories: [
        { id: 601, name: "Accessories", slug: "accessories" },
        { id: 602, name: "Equipment", slug: "equipment" }
      ]
    }
  ];
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2));
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

// Helper function to get admin header HTML
function getAdminHeader(req) {
  const userName = req.session.userName || 'Admin';
  
  return `
    <header style="background:#111;color:white;padding:15px 25px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;">
      <h2 style="margin:0;display:flex;align-items:center;gap:10px;"><i class="fas fa-crown"></i> Admin Dashboard</h2>
      <div style="display:flex;gap:15px;align-items:center;">
        <div style="display:flex;align-items:center;gap:15px;">
          <div style="width:45px;height:45px;background:#e53935;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">
            ${userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;">${userName}</div>
            <small style="color:#aaa;">Administrator</small>
          </div>
        </div>
        <a href="/" style="background:transparent;border:2px solid white;color:white;padding:8px 15px;border-radius:8px;text-decoration:none;">
          <i class="fas fa-globe"></i> View Site
        </a>
        <a href="/logout" style="background:#dc3545;color:white;border:none;padding:8px 15px;border-radius:8px;text-decoration:none;">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
        <a href="/admin/manage-sections" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
    <i class="fas fa-layout" style="width:25px;margin-right:15px;font-size:18px;"></i>
    <span>Sections</span>
</a>
      </div>
    </header>
    
    <div style="display:flex;min-height:calc(100vh - 70px);">
      <div style="width:250px;background:white;border-right:1px solid #e9ecef;padding:20px 0;position:sticky;top:70px;height:calc(100vh - 70px);overflow-y:auto;">
        <div style="padding:0 20px 30px;border-bottom:1px solid #e9ecef;">
          <h3 style="font-size:22px;margin-bottom:5px;color:#111;">Sports India</h3>
          <p style="font-size:12px;color:#6c757d;">Admin Control Panel</p>
        </div>
        
        <div style="padding:20px 0;">
          <a href="/admin" style="display:flex;align-items:center;padding:15px 25px;color:${req.path === '/admin' ? '#e53935' : '#212529'};text-decoration:none;transition:all 0.3s;border-left:4px solid ${req.path === '/admin' ? '#e53935' : 'transparent'};background:${req.path === '/admin' ? 'rgba(229,57,53,0.1)' : 'transparent'};">
            <i class="fas fa-tachometer-alt" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Dashboard</span>
          </a>
          <a href="/posts" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-box" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Products</span>
          </a>
          <a href="/admin/orders" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-shopping-cart" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Orders</span>
          </a>
          <a href="/admin/sliders" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-images" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Sliders</span>
          </a>
          <a href="/admin/categories" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-tags" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Categories</span>
          </a>
          <a href="/admin/customers" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-users" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Customers</span>
          </a>
          <a href="/admin/analytics" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-chart-line" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Analytics</span>
          </a>
          <a href="/admin/settings" style="display:flex;align-items:center;padding:15px 25px;color:#212529;text-decoration:none;transition:all 0.3s;border-left:4px solid transparent;">
            <i class="fas fa-cog" style="width:25px;margin-right:15px;font-size:18px;"></i>
            <span>Settings</span>
          </a>
        </div>
      </div>
      
      <div style="flex:1;padding:30px;overflow-y:auto;">
  `;
}

// Helper function to get header HTML
function getHeader(req) {
  let settings = {};
  try {
    if (fs.existsSync('settings.json')) {
      settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
    }
  } catch (e) {
    settings = getDefaultSettings();
  }
  
  const userName = req.session?.userName || 'Guest';
  const themeColor = settings.themeColor || '#e53935';
  const storeName = settings.storeName || 'SPORTS INDIA';
  const storeLogo = settings.storeLogo || '';
  const showBanner = settings.showBanner !== false;
  const bannerText = settings.bannerText || '🎉 Free Shipping on Orders Above ₹999!';
  const cartCount = req.session.cart ? req.session.cart.length : 0;
  
  return `
    <header style="background:#111;color:white;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:24px;font-weight:bold;">
        <a href="/" style="color:white;text-decoration:none;display:flex;align-items:center;gap:10px;">
          ${storeLogo ? `<img src="${storeLogo}" style="height:40px;vertical-align:middle;">` : ''}
          ${storeName}
        </a>
      </div>
      
      <div style="display:flex;gap:15px;align-items:center;">
        <a href="/" style="color:white;text-decoration:none;">Home</a>
        <a href="/products/filter" style="color:white;text-decoration:none;">Products</a>
        <a href="/about" style="color:white;text-decoration:none;">About</a>
        <a href="/contact" style="color:white;text-decoration:none;">Contact</a>
        <a href="/cart" style="color:white;text-decoration:none;position:relative;">
          🛒 Cart
          ${cartCount > 0 ? `
          <span style="position:absolute;top:-8px;right:-8px;background:${themeColor};color:white;border-radius:50%;padding:2px 6px;font-size:12px;font-weight:bold;">
            ${cartCount}
          </span>
          ` : ''}
        </a>
        ${req.session.userId ? `
          <a href="/profile" style="color:white;text-decoration:none;">👤 ${userName || 'Profile'}</a>
          <a href="/logout" style="color:white;text-decoration:none;">Logout</a>
        ` : `
          <a href="/login-user" style="color:white;text-decoration:none;">Login</a>
          <a href="/register" style="color:white;text-decoration:none;">Register</a>
        `}
        <button onclick="toggleDark()" style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;background:${themeColor};color:white;">
          ${settings.darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
    
    ${showBanner ? `
    <div style="background: ${themeColor}; color: white; text-align: center; padding: 10px; font-weight: 600;">
      ${bannerText}
    </div>
    ` : ''}
  `;
}

// Helper function to get footer HTML
function getFooter() {
  let settings = {};
  try {
    if (fs.existsSync('settings.json')) {
      settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
    }
  } catch (e) {
    settings = getDefaultSettings();
  }
  
  const themeColor = settings.themeColor || '#e53935';
  const storeName = settings.storeName || 'SPORTS INDIA';
  const storePhone = settings.storePhone || '+91 9813639843';
  const storeAddress = settings.storeAddress || '123 Sports Complex, Connaught Place, New Delhi';
  const darkMode = settings.darkMode || false;
  
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div>
          <h3>${storeName}</h3>
          <p>Premium sports gear for athletes. Boxing, Running & Wrestling – all in one place.</p>
        </div>
        
        <div>
          <h4>Quick Links</h4>
          <a href="/">Home</a>
          <a href="/products/filter">Products</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms & Conditions</a>
        </div>
        
        <div>
          <h4>Categories</h4>
          <a href="/products/filter?category=Running">Running</a>
          <a href="/products/filter?category=Boxing">Boxing</a>
          <a href="/products/filter?category=Wrestling">Wrestling</a>
          <a href="/products/filter?category=Cricket">Cricket</a>
          <a href="/products/filter?category=Football">Football</a>
        </div>
        
        <div>
          <h4>Contact</h4>
          <p>📞 ${storePhone}</p>
          <p>📍 ${storeAddress}</p>
          <a href="https://www.instagram.com/sportsindia_44" target="_blank">📸 Instagram</a>
          <a href="https://facebook.com/sportsindia" target="_blank">📘 Facebook</a>
          <a href="https://twitter.com/sportsindia" target="_blank">🐦 Twitter</a>
        </div>
      </div>
      
      <div class="footer-bottom">
        © ${new Date().getFullYear()} ${storeName}. All rights reserved.
      </div>
    </footer>
    
    <script>
      function toggleDark() {
        document.body.classList.toggle("dark");
        if (document.body.classList.contains("dark")) {
          localStorage.setItem("theme", "dark");
        } else {
          localStorage.setItem("theme", "light");
        }
      }
      
      window.onload = function() {
        const theme = localStorage.getItem("theme");
        const darkModeSetting = ${darkMode};
        if (theme === "dark" || (!theme && darkModeSetting)) {
          document.body.classList.add("dark");
        }
      };
    </script>
    
    <style>
      :root {
        --theme-color: ${themeColor};
      }
      
      .site-footer {
        background: #111;
        color: #ddd;
        margin-top: 60px;
      }
      
      .footer-grid {
        max-width: 1200px;
        margin: auto;
        padding: 40px 20px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 30px;
      }
      
      .site-footer h3, .site-footer h4 {
        color: white;
        margin-bottom: 10px;
      }
      
      .site-footer a {
        display: block;
        color: #bbb;
        text-decoration: none;
        margin-bottom: 6px;
        font-size: 14px;
      }
      
      .site-footer a:hover {
        color: var(--theme-color, #e53935);
      }
      
      .footer-bottom {
        text-align: center;
        padding: 15px;
        background: #000;
        font-size: 13px;
        color: #aaa;
      }
      
      body.dark {
        background: #121212;
        color: #eee;
      }
      
      body.dark header {
        background: #000;
      }
      
      body.dark .site-footer {
        background: #000;
      }
      
      body.dark .product-card,
      body.dark .content-card,
      body.dark .form-card {
        background: #1e1e1e;
        color: #eee;
      }
    </style>
  `;
}

// Helper function to get star rating HTML
function getStarRating(rating) {
  const stars = Math.round(rating * 2) / 2;
  let starString = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= stars) {
      starString += '★';
    } else if (i - 0.5 <= stars) {
      starString += '⯪';
    } else {
      starString += '☆';
    }
  }
  return starString;
}

function adjustColor(hex, percent) {
  if (!hex || hex === '#') return '#e53935';
  
  let R = parseInt(hex.substring(1,3), 16);
  let G = parseInt(hex.substring(3,5), 16);
  let B = parseInt(hex.substring(5,7), 16);
  
  R = Math.min(255, Math.max(0, R + percent));
  G = Math.min(255, Math.max(0, G + percent));
  B = Math.min(255, Math.max(0, B + percent));
  
  return '#' + (R < 16 ? '0' : '') + R.toString(16) + 
                (G < 16 ? '0' : '') + G.toString(16) + 
                (B < 16 ? '0' : '') + B.toString(16);
}

// HOMEPAGE
app.get("/", (req, res) => {
  const sliders = loadSliders().filter(slider => slider.active !== false);
  const products = loadPosts();
  const reviews = loadReviews();
  const categories = getCategories(products);
  
  const featuredProducts = products
    .filter(p => p.featured && (p.active !== false))
    .slice(0, 8);
  
  const newArrivals = products
    .filter(p => p.showInNewArrivals && p.active !== false)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const bestSellers = products
    .filter(p => p.showInBestSellers && p.active !== false)
    .map(product => {
        const productReviews = reviews.filter(r => r.productSlug === product.slug);
        const avgRating = productReviews.length > 0 
            ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
            : 0;
        return { ...product, avgRating, reviewCount: productReviews.length };
    })
    .slice(0, 8);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Sports India - Premium Sports Gear</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    /* ===== NEW HORIZONTAL GRID STYLES ===== */
.products-horizontal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 30px;
    padding: 20px;
    margin: 0 auto;
    max-width: 1400px;
}

.product-card-modern {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    transition: all 0.4s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255,255,255,0.1);
}

.product-card-modern:hover {
    transform: translateY(-10px);
    box-shadow: 0 30px 45px rgba(229,57,53,0.2);
}

.product-image-container {
    position: relative;
    overflow: hidden;
    aspect-ratio: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
}

.product-card-modern:hover .product-image {
    transform: scale(1.1);
}

.discount-badge-modern {
    position: absolute;
    top: 15px;
    left: 15px;
    background: linear-gradient(135deg, #FF6B6B, #FF8E53);
    color: white;
    padding: 8px 15px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 700;
    z-index: 2;
    box-shadow: 0 5px 15px rgba(255,107,107,0.3);
}

.wishlist-btn-modern {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 45px;
    height: 45px;
    background: white;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    color: #ff4757;
    font-size: 20px;
}

.wishlist-btn-modern:hover {
    background: #ff4757;
    color: white;
}

.product-info-modern {
    padding: 20px;
    background: linear-gradient(to bottom, white, #f8f9fa);
}

.product-category-modern {
    display: inline-block;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 15px;
    letter-spacing: 0.5px;
}

.product-title-modern {
    font-size: 18px;
    font-weight: 700;
    margin: 10px 0;
    color: #2d3436;
    line-height: 1.4;
    text-decoration: none;
}

.product-title-modern a {
    text-decoration: none;
    color: inherit;
}

.price-container-modern {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 15px 0;
    flex-wrap: wrap;
}

.current-price {
    font-size: 24px;
    font-weight: 800;
    background: linear-gradient(135deg, #e53935, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.original-price {
    font-size: 16px;
    color: #b2bec3;
    text-decoration: line-through;
}

.rating-container {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0;
}

.stars {
    color: #ffd700;
    font-size: 16px;
    letter-spacing: 2px;
}

.rating-count {
    color: #636e72;
    font-size: 14px;
    font-weight: 500;
}

.stock-status {
    display: inline-block;
    padding: 5px 15px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin: 10px 0;
}

.in-stock {
    background: linear-gradient(135deg, #00b09b, #96c93d);
    color: white;
}

.low-stock {
    background: linear-gradient(135deg, #f2994a, #f2c94c);
    color: white;
}

.out-of-stock {
    background: linear-gradient(135deg, #eb5757, #f2994a);
    color: white;
}

.action-buttons-modern {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.add-to-cart-btn {
    flex: 2;
    background: linear-gradient(135deg, #e53935, #ff6b6b);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 5px 15px rgba(229,57,53,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.add-to-cart-btn:hover {
    background: linear-gradient(135deg, #c62828, #e53935);
    transform: translateY(-2px);
}

.quick-view-btn {
    flex: 1;
    background: linear-gradient(135deg, #2c3e50, #3498db);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.quick-view-btn:hover {
    background: linear-gradient(135deg, #34495e, #2980b9);
    transform: translateY(-2px);
}

.featured-badge {
    position: absolute;
    top: 15px;
    left: 15px;
    background: linear-gradient(135deg, #f1c40f, #f39c12);
    color: white;
    padding: 8px 15px;
    border-radius: 25px;
    font-size: 12px;
    font-weight: 700;
    z-index: 2;
}
/* New Badge for New Arrivals */
.new-badge-modern {
    position: absolute;
    top: 15px;
    left: 15px;
    background: linear-gradient(135deg, #00b09b, #96c93d);
    color: white;
    padding: 8px 15px;
    border-radius: 25px;
    font-size: 12px;
    font-weight: 700;
    z-index: 2;
    box-shadow: 0 5px 15px rgba(0,176,155,0.3);
    animation: pulse 2s infinite;
}

/* Bestseller Badge */
.bestseller-badge-modern {
    position: absolute;
    top: 15px;
    left: 15px;
    background: linear-gradient(135deg, #f1c40f, #f39c12);
    color: white;
    padding: 8px 15px;
    border-radius: 25px;
    font-size: 12px;
    font-weight: 700;
    z-index: 2;
    box-shadow: 0 5px 15px rgba(241,196,15,0.3);
    animation: shine 2s infinite;
}

/* View All Button */
.view-all-btn {
    display: inline-block;
    background: linear-gradient(135deg, #2c3e50, #3498db);
    color: white;
    padding: 15px 40px;
    border-radius: 30px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    transition: all 0.3s ease;
    box-shadow: 0 5px 15px rgba(52,152,219,0.3);
}

.view-all-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(52,152,219,0.4);
}

.view-all-btn i {
    margin-left: 8px;
    transition: transform 0.3s ease;
}

.view-all-btn:hover i {
    transform: translateX(5px);
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

@keyframes shine {
    0% { opacity: 1; }
    50% { opacity: 0.8; }
    100% { opacity: 1; }
}

.section-header {
    text-align: center;
    margin: 50px 0 30px;
}

.section-header h2 {
    font-size: 36px;
    font-weight: 800;
    background: linear-gradient(135deg, #2c3e50, #3498db);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
    padding: 0 20px;
}

.category-filters {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin: 30px 0;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 10px 25px;
    border: 2px solid transparent;
    background: white;
    border-radius: 30px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #2c3e50;
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

.filter-btn:hover,
.filter-btn.active {
    background: linear-gradient(135deg, #e53935, #ff6b6b);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(229,57,53,0.3);
}

@media (max-width: 768px) {
    .products-horizontal-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
    }
    
    .product-title-modern {
        font-size: 16px;
    }
    
    .current-price {
        font-size: 20px;
    }
    
    .section-header h2 {
        font-size: 28px;
    }
}

@media (max-width: 480px) {
    .products-horizontal-grid {
        grid-template-columns: 1fr;
    }
    
    .action-buttons-modern {
        flex-direction: column;
    }
}
/* ===== END OF NEW STYLES ===== */  
    
    /* Hero Slider */
    .hero-slider {
      position: relative;
      height: 600px;
      overflow: hidden;
      border-radius: 20px;
      margin: 20px auto;
      max-width: 1400px;
    }
    
    .slider-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    .slider-slide {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 1s ease-in-out;
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: center;
      padding: 0 80px;
    }
    
    .slider-slide.active {
      opacity: 1;
    }
    
    .slider-content {
      max-width: 600px;
      background: rgba(0, 0, 0, 0.7);
      padding: 40px;
      border-radius: 15px;
      color: white;
    }
    
    .slider-content h1 {
      font-size: 48px;
      margin-bottom: 20px;
      color: white;
    }
    
    .slider-content p {
      font-size: 18px;
      margin-bottom: 30px;
      line-height: 1.6;
    }
    
    .slider-btn {
      display: inline-block;
      background: #e53935;
      color: white;
      padding: 15px 30px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 18px;
      transition: all 0.3s;
    }
    
    .slider-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .slider-controls {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
    }
    
    .slider-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .slider-dot.active {
      background: #e53935;
      transform: scale(1.2);
    }
    
    .slider-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      color: white;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.3s;
    }
    
    .slider-nav:hover {
      background: #e53935;
    }
    
    .slider-prev {
      left: 20px;
    }
    
    .slider-next {
      right: 20px;
    }
    
/* Categories Section */
.categories-section {
  max-width: 1400px;
  margin: 80px auto;
  padding: 0 20px;
}

.section-title {
  text-align: center;
  margin-bottom: 50px;
}

.section-title h2 {
  font-size: 36px;
  margin-bottom: 15px;
  color: #111;
}

.section-title p {
  color: #666;
  font-size: 18px;
  max-width: 600px;
  margin: 0 auto;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.category-card {
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  height: 250px;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.category-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.category-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
}

.category-card:hover .category-content {
  transform: scale(1.05);
}

.category-icon {
  font-size: 80px;
  margin-bottom: 20px;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.category-overlay {
  text-align: center;
  color: white;
  z-index: 2;
}

.category-overlay h3 {
  font-size: 28px;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.category-overlay p {
  font-size: 14px;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Add pattern overlay */
.category-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(255,255,255,0.1) 0px,
    rgba(255,255,255,0.1) 10px,
    transparent 10px,
    transparent 20px
  );
  pointer-events: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  .category-icon {
    font-size: 60px;
  }
  
  .category-overlay h3 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .category-card {
    height: 200px;
  }
}
    
    /* Features Section */
    .features-section {
      max-width: 1400px;
      margin: 80px auto;
      padding: 60px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      color: white;
      text-align: center;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 40px;
      margin-top: 50px;
    }
    
    .feature-item {
      text-align: center;
    }
    
    .feature-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    
    .feature-item h3 {
      font-size: 22px;
      margin-bottom: 15px;
    }
    
    /* Testimonials */
    .testimonials-section {
      max-width: 1400px;
      margin: 80px auto;
      padding: 0 20px;
    }
    
    .testimonial-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin: 0 15px;
    }
    
    .testimonial-text {
      font-size: 16px;
      line-height: 1.6;
      color: #666;
      margin-bottom: 20px;
      font-style: italic;
    }
    
    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 15px;
    }
     .action-buttons-modern {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.view-btn-modern {
    flex: 1;
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 5px 15px rgba(52,152,219,0.3);
}

.view-btn-modern:hover {
    background: linear-gradient(135deg, #2980b9, #3498db);
    transform: translateY(-2px);
    color: white;
}

.add-to-cart-btn {
    flex: 1;
    background: linear-gradient(135deg, #e53935, #ff6b6b);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 5px 15px rgba(229,57,53,0.3);
}

.add-to-cart-btn:hover {
    background: linear-gradient(135deg, #c62828, #e53935);
    transform: translateY(-2px);
} 
    
    .author-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #e53935;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 20px;
    }
    
    /* Newsletter */
    .newsletter-section {
      max-width: 1400px;
      margin: 80px auto;
      padding: 60px 20px;
      background: #f8f9fa;
      border-radius: 20px;
      text-align: center;
    }
    
    .newsletter-form {
      max-width: 500px;
      margin: 30px auto 0;
      display: flex;
      gap: 10px;
    }
    
    .newsletter-input {
      flex: 1;
      padding: 15px 20px;
      border: 2px solid #ddd;
      border-radius: 10px;
      font-size: 16px;
    }
    
    .newsletter-btn {
      background: #e53935;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    
    @media (max-width: 992px) {
      .hero-slider {
        height: 500px;
      }
      
      .slider-slide {
        padding: 0 40px;
      }
      
      .slider-content h1 {
        font-size: 36px;
      }
    }
    
    @media (max-width: 768px) {
      .hero-slider {
        height: 400px;
        border-radius: 10px;
      }
      
      .slider-slide {
        padding: 0 20px;
      }
      
      .slider-content {
        padding: 25px;
      }
      
      .slider-content h1 {
        font-size: 28px;
      }
      
      .slider-content p {
        font-size: 16px;
      }
      
      .slider-nav {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }
      
      .newsletter-form {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <!-- Hero Slider -->
  ${sliders.length > 0 ? `
  <div class="hero-slider">
    <div class="slider-container">
      ${sliders.map((slider, index) => `
      <div class="slider-slide ${index === 0 ? 'active' : ''}" 
           style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${slider.image}');">
        <div class="slider-content">
          <h1>${slider.title}</h1>
          <p>${slider.description}</p>
          ${slider.buttonText && slider.buttonLink ? `
          <a href="${slider.buttonLink}" class="slider-btn">${slider.buttonText}</a>
          ` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    
    ${sliders.length > 1 ? `
    <div class="slider-nav slider-prev" onclick="prevSlide()">←</div>
    <div class="slider-nav slider-next" onclick="nextSlide()">→</div>
    
    <div class="slider-controls">
      ${sliders.map((_, index) => `
      <div class="slider-dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></div>
      `).join('')}
    </div>
    ` : ''}
  </div>
  ` : `
  <!-- Fallback hero if no sliders -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 20px; text-align: center; border-radius: 20px; margin: 20px; max-width: 1400px; margin-left: auto; margin-right: auto;">
    <h1 style="font-size: 48px; margin-bottom: 20px;">Welcome to Sports India</h1>
    <p style="font-size: 20px; margin-bottom: 30px; max-width: 600px; margin-left: auto; margin-right: auto;">Premium sports gear for athletes. Boxing, Running & Wrestling – all in one place.</p>
    <a href="/products/filter" style="display: inline-block; background: white; color: #e53935; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 18px;">Shop Now</a>
  </div>
  `}

 <!-- Categories Section -->
<div class="categories-section">
  <div class="section-title">
    <h2>Shop by Category</h2>
    <p>Explore our wide range of sports equipment categories</p>
  </div>
  
  <div class="categories-grid">
    ${['Running', 'Boxing', 'Wrestling', 'Cricket', 'Football', 'Basketball'].map(category => {
      const categoryIcons = {
        'Running': '🏃',
        'Boxing': '🥊',
        'Wrestling': '🤼',
        'Cricket': '🏏',
        'Football': '⚽',
        'Basketball': '🏀'
      };
      
      const categoryColors = {
        'Running': '#4CAF50',
        'Boxing': '#F44336',
        'Wrestling': '#9C27B0',
        'Cricket': '#2196F3',
        'Football': '#FF9800',
        'Basketball': '#FF5722'
      };
      
      return `
      <div class="category-card" onclick="window.location.href='/products/filter?category=${category}'">
        <div class="category-content" style="background: linear-gradient(135deg, ${categoryColors[category]} 0%, ${adjustColor(categoryColors[category], 30)} 100%);">
          <div class="category-icon">${categoryIcons[category]}</div>
          <div class="category-overlay">
            <h3>${category}</h3>
            <p>Shop ${category} Gear</p>
          </div>
        </div>
      </div>
      `;
    }).join('')}
  </div>
</div>

<!-- ===== NEW HORIZONTAL FEATURED PRODUCTS ===== -->
<!-- Section Header -->
<div class="section-header">
    <h2>Featured Products</h2>
    <p>Our most popular and highly-rated products</p>
</div>

<!-- Category Filters -->
<div class="category-filters">
    <button class="filter-btn active" onclick="filterProducts('all')">All</button>
    <button class="filter-btn" onclick="filterProducts('men')">Men's</button>
    <button class="filter-btn" onclick="filterProducts('women')">Women's</button>
    <button class="filter-btn" onclick="filterProducts('kids')">Kids'</button>
</div>

<!-- Products Horizontal Grid -->
${featuredProducts.length > 0 ? `
<div class="products-horizontal-grid">
  ${featuredProducts.map(product => `
  <div class="product-card-modern">
    <div class="product-image-container">
      <a href="/product/${product.slug}">
        ${product.images && product.images[0] ? `
        <img src="${product.images[0]}" class="product-image" alt="${product.name || product.title || ''}">
        ` : `
        <div style="width: 100%; height: 100%; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
          <div style="text-align: center;">
            <div style="font-size: 48px;">🏏</div>
            <small>No Image</small>
          </div>
        </div>
        `}
      </a>
      
      ${product.discount ? `
      <span class="discount-badge-modern">
        ${product.discount.type === 'percentage' ? product.discount.value + '%' : '₹' + product.discount.value} OFF
      </span>
      ` : ''}
      
      <button class="wishlist-btn-modern" onclick="addToWishlist('${product.slug}')">🤍</button>
    </div>
    
    <div class="product-info-modern">
      <span class="product-category-modern">${product.category || 'General'}</span>
      <h3 class="product-title-modern">
        <a href="/product/${product.slug}">${product.name || product.title || 'Unnamed Product'}</a>
      </h3>
      
      ${product.brand ? `
      <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Brand: ${product.brand}</div>
      ` : ''}
      
      <div class="price-container-modern">
        <span class="current-price">₹ ${product.price || 0}</span>
        ${product.originalPrice && product.originalPrice > product.price ? `
        <span class="original-price">₹ ${product.originalPrice}</span>
        ` : ''}
      </div>
      
      <div class="rating-container">
        <span class="stars">${getStarRating(product.avgRating || 0)}</span>
        <span class="rating-count">(${product.reviewCount || 0} reviews)</span>
      </div>
      
      <div class="stock-status ${(product.stock || 0) > 10 ? 'in-stock' : (product.stock || 0) > 0 ? 'low-stock' : 'out-of-stock'}">
        ${(product.stock || 0) > 10 ? '✓ In Stock (' + product.stock + '+)' : 
          (product.stock || 0) > 0 ? '⚡ Only ' + product.stock + ' Left' : 
          '✗ Out of Stock'}
      </div>
      
      <div class="action-buttons-modern">
        <a href="/product/${product.slug}" class="view-btn-modern">
            <i class="fas fa-eye"></i> View Details
        </a>
        <button class="add-to-cart-btn" onclick="addToCart('${product.slug}')">
            <i class="fas fa-shopping-cart"></i> Add to Cart
        </button>
      </div>
    </div>
  </div>
  `).join('')}
</div>
` : `
<div style="text-align: center; padding: 60px 20px; background: #f8f9fa; border-radius: 15px;">
  <div style="font-size: 48px; margin-bottom: 20px;">🏏</div>
  <h3>No Featured Products Yet</h3>
  <p style="color: #666;">Check back soon for our featured products!</p>
</div>
`}

<!-- ===== END OF NEW SECTION ===== -->

  <!-- Features Section -->
  <div class="features-section">
    <h2 style="font-size: 36px; margin-bottom: 20px;">Why Choose Sports India?</h2>
    <p style="font-size: 18px; max-width: 700px; margin: 0 auto 30px;">We're committed to providing the best sports equipment and customer experience</p>
    
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">🚚</div>
        <h3>Free Shipping</h3>
        <p>Free delivery on orders above ₹999</p>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">🔄</div>
        <h3>30-Day Returns</h3>
        <p>Easy returns and exchanges</p>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">🛡️</div>
        <h3>Quality Guarantee</h3>
        <p>100% genuine products</p>
      </div>
      
      <div class="feature-item">
        <div class="feature-icon">💯</div>
        <h3>Expert Support</h3>
        <p>Sports professionals to help you choose</p>
      </div>
    </div>
  </div>
<!-- ===== NEW ARRIVALS - SAME STYLE AS FEATURED PRODUCTS ===== -->
${newArrivals.length > 0 ? `
<!-- Section Header -->
<div class="section-header">
    <h2>New Arrivals</h2>
    <p>Check out our latest products</p>
</div>

<!-- Products Horizontal Grid -->
<div class="products-horizontal-grid">
    ${newArrivals.slice(0, 8).map(product => `
    <div class="product-card-modern">
        <div class="product-image-container">
            <a href="/product/${product.slug}">
                ${product.images && product.images[0] ? `
                <img src="${product.images[0]}" class="product-image" alt="${product.name}">
                ` : `
                <div style="width: 100%; height: 100%; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px;">🏏</div>
                        <small>No Image</small>
                    </div>
                </div>
                `}
            </a>
            
            <span class="new-badge-modern">NEW</span>
            
            <button class="wishlist-btn-modern" onclick="addToWishlist('${product.slug}')">❤️</button>
        </div>
        
        <div class="product-info-modern">
            <span class="product-category-modern">${product.category || 'General'}</span>
            <h3 class="product-title-modern">
                <a href="/product/${product.slug}">${product.name}</a>
            </h3>
            
            <div class="price-container-modern">
                <span class="current-price">₹ ${product.price}</span>
                ${product.originalPrice && product.originalPrice > product.price ? `
                <span class="original-price">₹ ${product.originalPrice}</span>
                ` : ''}
            </div>
            
            <div class="rating-container">
                <span class="stars">${getStarRating(product.avgRating || 0)}</span>
                <span class="rating-count">(${product.reviewCount || 0} reviews)</span>
            </div>
            
            <div class="stock-status ${(product.stock || 0) > 10 ? 'in-stock' : (product.stock || 0) > 0 ? 'low-stock' : 'out-of-stock'}">
                ${(product.stock || 0) > 10 ? '✓ In Stock (' + product.stock + '+)' : 
                  (product.stock || 0) > 0 ? '⚡ Only ' + product.stock + ' Left' : 
                  '✗ Out of Stock'}
            </div>
            
            <div class="action-buttons-modern">
                <a href="/product/${product.slug}" class="view-btn-modern">
                    <i class="fas fa-eye"></i> View
                </a>
                <button class="add-to-cart-btn" onclick="addToCart('${product.slug}')">
                    <i class="fas fa-shopping-cart"></i> Add
                </button>
                <button class="wishlist-btn-small" onclick="addToWishlist('${product.slug}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    </div>
    `).join('')}
</div>

<div style="text-align: center; margin: 40px 0 60px;">
    <a href="/products/filter?sort=newest" class="view-all-btn">
        View All New Arrivals <i class="fas fa-arrow-right"></i>
    </a>
</div>
` : ''}

<!-- ===== BEST SELLERS - SAME STYLE AS FEATURED PRODUCTS ===== -->
${bestSellers.length > 0 ? `
<!-- Section Header -->
<div class="section-header">
    <h2>Best Sellers</h2>
    <p>Our top-rated products by customers</p>
</div>

<!-- Products Horizontal Grid -->
<div class="products-horizontal-grid">
    ${bestSellers.slice(0, 8).map(product => `
    <div class="product-card-modern">
        <div class="product-image-container">
            <a href="/product/${product.slug}">
                ${product.images && product.images[0] ? `
                <img src="${product.images[0]}" class="product-image" alt="${product.name}">
                ` : `
                <div style="width: 100%; height: 100%; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px;">🏏</div>
                        <small>No Image</small>
                    </div>
                </div>
                `}
            </a>
            
            <span class="bestseller-badge-modern">#1 BESTSELLER</span>
            
            <button class="wishlist-btn-modern" onclick="addToWishlist('${product.slug}')">❤️</button>
        </div>
        
        <div class="product-info-modern">
            <span class="product-category-modern">${product.category || 'General'}</span>
            <h3 class="product-title-modern">
                <a href="/product/${product.slug}">${product.name}</a>
            </h3>
            
            <div class="price-container-modern">
                <span class="current-price">₹ ${product.price}</span>
                ${product.originalPrice && product.originalPrice > product.price ? `
                <span class="original-price">₹ ${product.originalPrice}</span>
                ` : ''}
            </div>
            
            <div class="rating-container">
                <span class="stars">${getStarRating(product.avgRating || 0)}</span>
                <span class="rating-count">(${product.reviewCount || 0} reviews)</span>
            </div>
            
            <div class="stock-status ${(product.stock || 0) > 10 ? 'in-stock' : (product.stock || 0) > 0 ? 'low-stock' : 'out-of-stock'}">
                ${(product.stock || 0) > 10 ? '✓ In Stock (' + product.stock + '+)' : 
                  (product.stock || 0) > 0 ? '⚡ Only ' + product.stock + ' Left' : 
                  '✗ Out of Stock'}
            </div>
            
            <div class="action-buttons-modern">
                <a href="/product/${product.slug}" class="view-btn-modern">
                    <i class="fas fa-eye"></i> View
                </a>
                <button class="add-to-cart-btn" onclick="addToCart('${product.slug}')">
                    <i class="fas fa-shopping-cart"></i> Add
                </button>
                <button class="wishlist-btn-small" onclick="addToWishlist('${product.slug}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    </div>
    `).join('')}
</div>

<div style="text-align: center; margin: 40px 0 60px;">
    <a href="/products/filter?sort=rating" class="view-all-btn">
        View All Best Sellers <i class="fas fa-arrow-right"></i>
    </a>
</div>
` : ''}

  <!-- Newsletter -->
  <div class="newsletter-section">
    <h2 style="font-size: 36px; margin-bottom: 20px;">Stay Updated</h2>
    <p style="font-size: 18px; color: #666; max-width: 600px; margin: 0 auto;">Subscribe to our newsletter for exclusive deals, new arrivals, and sports tips</p>
    
    <form class="newsletter-form" method="POST" action="/subscribe-newsletter">
      <input type="email" name="email" class="newsletter-input" placeholder="Enter your email" required>
      <button type="submit" class="newsletter-btn">Subscribe</button>
    </form>
    
    <p style="margin-top: 20px; color: #666; font-size: 14px;">We respect your privacy. Unsubscribe at any time.</p>
  </div>

  ${getFooter()}
  
  <script>
    // Slider functionality
    ${sliders.length > 0 ? `
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slider-slide');
    const dots = document.querySelectorAll('.slider-dot');
    const totalSlides = slides.length;
    
    function showSlide(index) {
      slides.forEach(slide => slide.classList.remove('active'));
      dots.forEach(dot => dot.classList.remove('active'));
      
      slides[index].classList.add('active');
      dots[index].classList.add('active');
      currentSlide = index;
    }
    
    function nextSlide() {
      let nextIndex = currentSlide + 1;
      if (nextIndex >= totalSlides) nextIndex = 0;
      showSlide(nextIndex);
    }
    
    function prevSlide() {
      let prevIndex = currentSlide - 1;
      if (prevIndex < 0) prevIndex = totalSlides - 1;
      showSlide(prevIndex);
    }
    
    function goToSlide(index) {
      showSlide(index);
    }
    
    setInterval(nextSlide, 5000);
    
    document.querySelector('.hero-slider').addEventListener('mouseenter', () => {
      clearInterval(slideInterval);
    });
    
    document.querySelector('.hero-slider').addEventListener('mouseleave', () => {
      slideInterval = setInterval(nextSlide, 5000);
    });
    
    let slideInterval = setInterval(nextSlide, 5000);
    ` : ''}
    
    function addToCart(slug) {
      fetch('/add-to-cart-quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: slug,
          quantity: 1
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Product added to cart!');
        } else {
          alert('Error adding to cart');
        }
      });
    }
    
    document.querySelector('.newsletter-form')?.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = this.querySelector('input[name="email"]').value;
      
      fetch('/subscribe-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Thank you for subscribing!');
          this.reset();
        } else {
          alert(data.error || 'Error subscribing');
        }
      });
    });
    
    function filterProducts(category) {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
      
      if (category !== 'all') {
        window.location.href = '/products/filter?gender=' + category;
      } else {
        window.location.href = '/products/filter';
      }
    }
    
    function quickView(slug) {
      window.location.href = '/product/' + slug;
    }
    
    function addToWishlist(slug) {
      fetch('/add-to-wishlist/' + slug, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Added to wishlist!');
          } else {
            alert(data.message || 'Please login to add to wishlist');
          }
        });
    }
  </script>

</body>
</html>`);
});

// QUICK ADD TO CART ENDPOINT
app.post("/add-to-cart-quick", (req, res) => {
  const { slug, quantity } = req.body;
  console.log("Adding to cart:", { slug, quantity }); // Debug log
  
  const products = loadPosts();
  const product = products.find(p => p.slug === slug);
  
  if (!product) {
    console.log("Product not found:", slug);
    return res.json({ success: false, error: "Product not found" });
  }
  
  // Initialize cart if it doesn't exist
  if (!req.session.cart) {
    req.session.cart = [];
  }
  
  // Check if product already in cart
  const existingIndex = req.session.cart.findIndex(item => item.slug === slug);
  
  if (existingIndex >= 0) {
    // Update quantity
    req.session.cart[existingIndex].quantity += (quantity || 1);
    console.log("Updated existing item:", req.session.cart[existingIndex]);
  } else {
    // Add new item with ALL product data
    const cartItem = {
      slug: product.slug,
      name: product.name || 'Product',
      price: parseFloat(product.price) || 0,
      originalPrice: product.originalPrice || product.price,
      quantity: quantity || 1,
      image: (product.images && product.images.length > 0) ? product.images[0] : null,
      category: product.category || 'General',
      brand: product.brand || '',
      addedAt: new Date().toISOString()
    };
    
    req.session.cart.push(cartItem);
    console.log("Added new item:", cartItem);
  }
  
  // Save session explicitly
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.json({ success: false, error: "Failed to save cart" });
    }
    
    console.log("Cart updated:", req.session.cart);
    res.json({ 
      success: true, 
      cartCount: req.session.cart.length,
      cart: req.session.cart 
    });
  });
});

// SUBSCRIBE NEWSLETTER
app.post("/subscribe-newsletter", (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.json({ success: false, error: "Invalid email" });
  }
  
  let newsletter = [];
  try {
    if (fs.existsSync(NEWSLETTER_FILE)) {
      newsletter = JSON.parse(fs.readFileSync(NEWSLETTER_FILE, "utf8"));
    }
  } catch (e) {
    newsletter = [];
  }
  
  const alreadySubscribed = newsletter.some(sub => sub.email === email);
  
  if (alreadySubscribed) {
    return res.json({ success: true, message: "Already subscribed" });
  }
  
  newsletter.push({
    email: email,
    subscribedAt: new Date().toISOString(),
    active: true
  });
  
  fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(newsletter, null, 2));
  
  res.json({ success: true, message: "Subscribed successfully" });
});

// ADMIN LOGIN PAGE
app.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect("/admin");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Admin Login | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    
    .login-box {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 450px;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .login-header h1 {
      font-size: 32px;
      color: #111;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .login-header p {
      color: #666;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .login-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 18px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }
    
    .login-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .login-footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
    }
    
    .login-footer a {
      color: #e53935;
      font-weight: 600;
      text-decoration: none;
    }
    
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .brand-logo {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .brand-logo h2 {
      font-size: 28px;
      color: #e53935;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="login-box">
      <div class="brand-logo">
        <h2>🏏 SPORTS INDIA</h2>
      </div>
      
      <div class="login-header">
        <h1><i class="fas fa-lock"></i> Admin Login</h1>
        <p>Enter your credentials to access the admin panel</p>
      </div>
      
      ${req.query.error ? `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i> ${req.query.error}
      </div>
      ` : ''}
      
      ${req.query.success ? `
      <div class="success-message">
        <i class="fas fa-check-circle"></i> ${req.query.success}
      </div>
      ` : ''}
      
      <form method="POST" action="/login">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" name="username" class="form-input" placeholder="Enter username" required autofocus>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-input" placeholder="Enter password" required>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="remember">
            <span>Remember me</span>
          </label>
        </div>
        
        <button type="submit" class="login-btn">
          <i class="fas fa-sign-in-alt"></i> Login to Dashboard
        </button>
      </form>
      
      <div class="login-footer">
        <p>For testing, use: <strong>admin</strong> / <strong>admin123</strong></p>
        <p style="margin-top: 20px;">
          <a href="/" style="font-size: 14px;">
            <i class="fas fa-arrow-left"></i> Back to Website
          </a>
        </p>
      </div>
    </div>
  </div>
  
  <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
  
  <script>
    document.querySelector('input[name="username"]').focus();
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        document.querySelector('form').submit();
      }
    });
  </script>
</body>
</html>`);
});

// ADMIN LOGIN POST
app.post("/login", loginLimiter, (req, res) => {
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
  
  if (user && comparePassword(password, user.password)) {
    req.session.loggedIn = true;
    req.session.userName = user.name;
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.role = user.role || 'user';
    
    return res.redirect("/admin");
  }
  
  res.redirect("/login?error=Invalid username or password");
});

// POSTS PAGE (Products List)
app.get("/posts", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const posts = loadPosts();
  const categories = getCategories(posts);
  const q = (req.query.q || "").toLowerCase();
  const selectedCat = req.query.cat;
  
  let filteredPosts = posts;
  
  if (q) {
    filteredPosts = filteredPosts.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }
  
  if (selectedCat && selectedCat !== "all") {
    filteredPosts = filteredPosts.filter(p =>
      (p.category || "").toLowerCase() === selectedCat.toLowerCase()
    );
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Manage Products | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .posts-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .page-actions {
      display: flex;
      gap: 15px;
    }
    
    .search-box {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .search-input {
      flex: 1;
      padding: 12px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
    }
    
    .search-btn {
      background: #e53935;
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
    }
    
    .category-filter {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 30px;
    }
    
    .category-btn {
      padding: 8px 20px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    
    .category-btn.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .post-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: all 0.3s;
    }
    
    .post-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    }
    
    .post-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .post-content {
      padding: 25px;
    }
    
    .post-category {
      display: inline-block;
      background: #f0f0f0;
      color: #666;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .post-title {
      font-size: 20px;
      margin: 0 0 10px 0;
      color: #111;
    }
    
    .post-price {
      font-size: 24px;
      color: #e53935;
      font-weight: bold;
      margin-bottom: 15px;
    }
    
    .post-stock {
      font-size: 14px;
      margin-bottom: 20px;
    }
    
    .stock-in {
      color: #4caf50;
    }
    
    .stock-out {
      color: #f44336;
    }
    
    .post-actions {
      display: flex;
      gap: 10px;
    }
    
    .btn {
      padding: 10px 15px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      grid-column: 1 / -1;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 40px;
    }
    
    .page-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
    }
    
    .page-btn.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    .stats-bar {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .stat-item {
      text-align: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 10px;
      flex: 1;
    }
    
    .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 5px;
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .posts-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      }
      
      .stats-bar {
        flex-direction: column;
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="posts-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-box"></i> Manage Products
        </h1>
        <p style="color: #666; margin-top: 5px;">Total: ${posts.length} products</p>
      </div>
      
      <div class="page-actions">
        <a href="/add-product" class="btn btn-primary">
          <i class="fas fa-plus"></i> Add Product
        </a>
        <a href="/admin" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back to Dashboard
        </a>
      </div>
    </div>
    
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-number">${posts.length}</div>
        <div>Total Products</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${posts.filter(p => (p.stock || 0) > 0).length}</div>
        <div>In Stock</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${categories.length}</div>
        <div>Categories</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">₹${posts.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}</div>
        <div>Total Value</div>
      </div>
    </div>
    
    <div class="search-box">
      <input type="text" class="search-input" placeholder="Search products..." id="searchInput" value="${q}">
      <button class="search-btn" onclick="searchProducts()">
        <i class="fas fa-search"></i> Search
      </button>
    </div>
    
    <div class="category-filter">
      <button class="category-btn ${!selectedCat ? 'active' : ''}" onclick="window.location.href='/posts'">
        All Products
      </button>
      ${categories.map(cat => `
      <button class="category-btn ${selectedCat === cat ? 'active' : ''}" onclick="window.location.href='/posts?cat=${cat}'">
        ${cat}
      </button>
      `).join('')}
    </div>
    
    ${filteredPosts.length === 0 ? `
    <div class="empty-state">
      <div style="font-size: 80px; margin-bottom: 30px; color: #ddd;">
        <i class="fas fa-box-open"></i>
      </div>
      <h2 style="margin-bottom: 20px;">No products found</h2>
      <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
        ${q || selectedCat ? 'Try changing your search or filter criteria.' : 'Get started by adding your first product.'}
      </p>
      <a href="/add-product" class="btn btn-primary" style="font-size: 16px; padding: 15px 30px;">
        <i class="fas fa-plus"></i> Add First Product
      </a>
    </div>
    ` : `
    <div class="posts-grid">
      ${filteredPosts.map((post, index) => `

        <div class="post-card">
  <div style="position: relative;">
    ${post.images && post.images[0] ? `
    <img src="${post.images[0]}" class="post-image" alt="${post.name}">
    ${post.images && post.images.length > 1 ? `
    <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 20px; font-size: 12px;">
      <i class="fas fa-images"></i> +${post.images.length - 1}
    </div>
    ` : ''}
    ` : `
    <div style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">
      <div style="text-align: center;">
        <div style="font-size: 48px;">🏏</div>
        <small>No Image</small>
      </div>
    </div>
    `}
  </div>
  
  <div class="post-content">
    <div class="post-category">${post.category || 'General'}</div>
    <h3 class="post-title">${post.name}</h3>
    <div class="post-price">₹ ${post.price}</div>
    
    <div class="post-stock ${(post.stock || 0) > 0 ? 'stock-in' : 'stock-out'}">
      <i class="fas ${(post.stock || 0) > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
      ${(post.stock || 0) > 0 ? `${post.stock} in stock` : 'Out of stock'}
    </div>
    
    <p style="color: #666; font-size: 14px; margin-bottom: 20px; line-height: 1.5;">
      ${(post.description || '').substring(0, 100)}${(post.description || '').length > 100 ? '...' : ''}
    </p>
    
    <div class="post-actions">
      <a href="/add-product?edit=${index}" class="btn btn-primary">
        <i class="fas fa-edit"></i> Edit
      </a>
      <a href="/product/${post.slug}" target="_blank" class="btn btn-secondary">
        <i class="fas fa-eye"></i> View
      </a>
      <button onclick="deleteProduct(${index})" class="btn btn-danger">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  </div>
</div>
      `).join('')}
    </div>
    
    ${filteredPosts.length > 12 ? `
    <div class="pagination">
      <button class="page-btn">←</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn">→</button>
    </div>
    ` : ''}
    `}
  </div>
  
  ${getAdminFooter()}
  
  <script>
    function searchProducts() {
      const query = document.getElementById('searchInput').value;
      window.location.href = '/posts?q=' + encodeURIComponent(query);
    }
    
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        searchProducts();
      }
    });
    
    function deleteProduct(index) {
      if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        fetch('/delete-post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ index: index })
        })
        .then(response => {
          if (response.ok) {
            location.reload();
          } else {
            alert('Error deleting product');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Network error - please try again');
        });
      }
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Products management page loaded');
    });
  </script>
</body>
</html>`);
});

// ADD/EDIT PRODUCT PAGE
app.get("/add-product", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const posts = loadPosts();
  const categories = loadCategories();
  let product = null;
  let isEditMode = false;
  
  if (req.query.edit !== undefined) {
    const editIndex = parseInt(req.query.edit);
    if (editIndex >= 0 && editIndex < posts.length) {
      product = posts[editIndex];
      isEditMode = true;
    }
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${isEditMode ? 'Edit Product' : 'Add Product'} | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .product-form-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 20px 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .form-card { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 50px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
    .form-group { margin-bottom: 25px; }
    .form-label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 16px; }
    .form-label.required::after { content: " *"; color: #e53935; }
    .form-input, .form-select, .form-textarea { width: 100%; padding: 15px; border: 2px solid #e1e5e9; border-radius: 10px; font-size: 16px; transition: all 0.3s; font-family: inherit; }
    .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #e53935; box-shadow: 0 0 0 3px rgba(229,57,53,0.1); }
    .form-textarea { min-height: 150px; resize: vertical; }
    .btn { padding: 15px 30px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; font-size: 16px; transition: all 0.3s; }
    .btn-primary { background: #e53935; color: white; }
    .btn-primary:hover { background: #c62828; transform: translateY(-2px); }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-outline { background: white; color: #e53935; border: 2px solid #e53935; }
    .btn-success { background: #28a745; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    
    .sizes-section { border: 2px solid #e1e5e9; border-radius: 10px; padding: 20px; margin-bottom: 25px; }
    .sizes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .size-stock-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .size-stock-table th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; }
    .size-stock-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
    .size-stock-table input { width: 80px; padding: 8px; border: 2px solid #e1e5e9; border-radius: 6px; text-align: center; }
    .add-size-row { display: flex; gap: 10px; align-items: center; margin-top: 15px; }
    .add-size-input { flex: 1; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; }
    .add-size-btn { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .delete-size-btn { background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .stock-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-in-stock { background: #d4edda; color: #155724; }
    .badge-out-stock { background: #f8d7da; color: #721c24; }
    .total-stock { font-size: 18px; font-weight: bold; color: #111; margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee; }
    
    .price-container { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
    .price-input-group { flex: 2; position: relative; }
    .price-input-group .currency { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); font-weight: 600; color: #666; }
    .price-input-group .price-field { padding-left: 35px; }
    .discount-badge { background: #28a745; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .original-price { text-decoration: line-through; color: #999; font-size: 14px; }
    .final-price { font-size: 20px; font-weight: bold; color: #e53935; }
    .discount-input-group { display: flex; gap: 10px; align-items: center; margin-top: 10px; }
    .discount-input { width: 100px; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; text-align: center; }
    .discount-type { padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; }
    
    .category-container { border: 2px solid #e1e5e9; border-radius: 10px; padding: 20px; margin-bottom: 25px; background: #f8f9fa; }
    .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .category-tabs { display: flex; gap: 10px; margin-bottom: 15px; }
    .category-tab { padding: 10px 20px; border: 2px solid #e1e5e9; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; }
    .category-tab.active { background: #e53935; color: white; border-color: #e53935; }
    .category-select-group { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .subcategory-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .subcategory-item { padding: 8px 15px; background: #f8f9fa; border: 2px solid #e1e5e9; border-radius: 20px; cursor: pointer; font-size: 14px; transition: all 0.3s; }
    .subcategory-item.selected { background: #e53935; color: white; border-color: #e53935; }
    
    .toggle-switch { display: flex; align-items: center; gap: 15px; }
    .switch { position: relative; display: inline-block; width: 60px; height: 34px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
    .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: #e53935; }
    input:checked + .slider:before { transform: translateX(26px); }
    
    .file-upload { position: relative; overflow: hidden; display: inline-block; width: 100%; }
    .file-upload input[type="file"] { position: absolute; left: 0; top: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
    .file-upload-label { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px 20px; border: 2px dashed #ced4da; border-radius: 10px; background: #f8f9fa; cursor: pointer; transition: all 0.3s; }
    .file-upload-label:hover { border-color: #e53935; background: #f0f0f0; }
    .file-upload-label i { font-size: 48px; color: #6c757d; margin-bottom: 15px; }
    .image-preview { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px; }
    .preview-image { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd; }
    /* Add these styles inside the existing <style> tag */
.existing-images {
    margin-bottom: 20px;
}

.existing-image-item {
    position: relative;
    width: 120px;
}

.existing-image-item img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    border: 2px solid #ddd;
}

.existing-image-item button {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    cursor: pointer;
    font-weight: bold;
}

#newImagePreview div {
    position: relative;
    width: 120px;
    display: inline-block;
    margin-right: 10px;
}

#newImagePreview img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    border: 2px solid #28a745;
}

#newImagePreview button {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    cursor: pointer;
    font-weight: bold;
}
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="product-form-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas ${isEditMode ? 'fa-edit' : 'fa-plus'}"></i> 
          ${isEditMode ? 'Edit Product' : 'Add New Product'}
        </h1>
        <p style="color: #666; margin-top: 5px;">
          ${isEditMode ? 'Update product details' : 'Fill in the details to add a new product'}
        </p>
      </div>
      
      <div>
        <a href="/posts" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back to Products
        </a>
      </div>
    </div>
    
    <div class="form-card">
      <form method="POST" action="/add-product" enctype="multipart/form-data" id="productForm">
        ${isEditMode ? `<input type="hidden" name="editIndex" value="${req.query.edit}">` : ''}
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Product Name</label>
            <input type="text" name="name" class="form-input" 
                   placeholder="Enter product name" 
                   value="${product ? product.name || '' : ''}" 
                   required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Brand</label>
            <input type="text" name="brand" class="form-input" 
                   placeholder="Enter brand name" 
                   value="${product ? product.brand || '' : ''}">
          </div>
        </div>
        
        
        <div class="category-container">
          <div class="category-header">
            <h3 style="margin: 0;"><i class="fas fa-tags"></i> Category</h3>
          </div>
          
          <div class="form-group">
            <label class="form-label">Main Category</label>
            <select name="category" class="form-select" id="mainCategory">
              <option value="">Select Category</option>
              ${categories.map(cat => `
              <option value="${cat.name}" ${product && product.category === cat.name ? 'selected' : ''}>
                ${cat.name}
              </option>
              `).join('')}
              <option value="new">+ Add New Category</option>
            </select>
          </div>
          
          <div class="form-group" id="newCategoryField" style="display: none;">
            <label class="form-label">New Category Name</label>
            <input type="text" name="new_category" class="form-input" placeholder="Enter new category name">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Price</label>
            <div class="price-input-group">
              <span class="currency">₹</span>
              <input type="number" name="price" id="price" class="form-input price-field" 
                     placeholder="Price" step="0.01" min="0"
                     value="${product ? product.price : ''}" 
                     onchange="calculateDiscount()"
                     required>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Discount %</label>
            <input type="number" name="discount" id="discount" class="form-input" 
                   placeholder="Discount percentage" min="0" max="100"
                   value="${product && product.discount ? product.discount.value : ''}"
                   onchange="calculateDiscount()">
            <small style="color: #666;">Final price: ₹<span id="finalPrice">${product ? product.price : '0'}</span></small>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" class="form-textarea" 
                    placeholder="Enter product description...">${product ? product.description : ''}</textarea>
        </div>
        
        <div class="sizes-section">
          <div class="sizes-header">
            <h3 style="margin: 0;"><i class="fas fa-tshirt"></i> Size-wise Stock</h3>
          </div>
          
          <table class="size-stock-table" id="sizeStockTable">
            <thead>
              <tr>
                <th>Size</th>
                <th>Stock Quantity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="sizeStockBody">
              ${product && product.sizeStock ? Object.entries(product.sizeStock).map(([size, stock]) => `
              <tr>
                <td><input type="text" name="size_names[]" value="${size}" class="form-input" style="width: 80px;" readonly></td>
                <td><input type="number" name="size_stocks[]" value="${stock}" class="form-input" min="0" style="width: 80px;" onchange="updateTotalStock()"></td>
                <td><span class="stock-badge ${stock > 0 ? 'badge-in-stock' : 'badge-out-stock'}">${stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>
                <td><button type="button" class="delete-size-btn" onclick="removeSizeRow(this)"><i class="fas fa-trash"></i></button></td>
              </tr>
              `).join('') : ''}
            </tbody>
          </table>
          
          <div class="add-size-row">
            <input type="text" id="newSize" class="add-size-input" placeholder="Size (e.g., S, M, L, XL)">
            <input type="number" id="newStock" class="add-size-input" placeholder="Stock" min="0" value="0">
            <button type="button" class="add-size-btn" onclick="addSize()">
              <i class="fas fa-plus"></i> Add Size
            </button>
          </div>
          
          <div class="total-stock">
            Total Stock: <span id="totalStock">${product ? (product.stock || 0) : 0}</span> units
            <input type="hidden" name="stock" id="totalStockInput" value="${product ? product.stock || 0 : 0}">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Colors (comma separated)</label>
          <input type="text" name="colors" class="form-input" 
                 placeholder="Red, Blue, Black, White"
                 value="${product && product.colors ? product.colors.join(', ') : ''}">
        </div>
        
    <!-- Images Section -->
<div class="form-group">
    <label class="form-label">Product Images (Max 5)</label>
    
    <!-- Existing Images (for edit mode) -->
    ${isEditMode && product && product.images && product.images.length > 0 ? `
    <div class="existing-images" style="margin-bottom: 20px;">
        <h4 style="margin-bottom: 10px;">Current Images</h4>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            ${product.images.map((img, idx) => `
            <div class="existing-image-item" style="position: relative; width: 120px;">
                <img src="${img}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;">
                <input type="hidden" name="existingImages" value="${img}">
                <button type="button" onclick="removeExistingImage(this)" style="position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-weight: bold;">×</button>
            </div>
            `).join('')}
        </div>
    </div>
    ` : ''}
    
    <!-- File Upload for New Images -->
    <div class="file-upload">
        <div class="file-upload-label" onclick="document.getElementById('imageUpload').click()">
            <i class="fas fa-cloud-upload-alt"></i>
            <span style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">
                Click to upload new images
            </span>
            <span style="color: #666; text-align: center;">
                Supported formats: JPG, PNG, GIF<br>
                Max file size: 5MB per image
            </span>
        </div>
        <input type="file" name="images" id="imageUpload" accept="image/*" multiple 
               ${!isEditMode ? 'required' : ''} onchange="previewNewImages(this)">
    </div>
    
    <!-- Preview for New Images -->
    <div id="newImagePreview" style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;"></div>
</div>
        <div class="form-row">
  <div class="form-group">
    <div class="toggle-switch">
      <label class="switch">
        <input type="checkbox" name="featured" ${product && product.featured ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <span>⭐ Featured Product</span>
    </div>
    <small style="color: #666; display: block; margin-top: 5px;">Show in Featured Products section on homepage</small>
  </div>
  
  <div class="form-group">
    <div class="toggle-switch">
      <label class="switch">
        <input type="checkbox" name="showInNewArrivals" ${product && product.showInNewArrivals ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <span>✨ New Arrival</span>
    </div>
    <small style="color: #666; display: block; margin-top: 5px;">Show in New Arrivals section on homepage</small>
  </div>
</div>

<div class="form-row">
  <div class="form-group">
    <div class="toggle-switch">
      <label class="switch">
        <input type="checkbox" name="showInBestSellers" ${product && product.showInBestSellers ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <span>🏆 Best Seller</span>
    </div>
    <small style="color: #666; display: block; margin-top: 5px;">Show in Best Sellers section on homepage</small>
  </div>
  
  <div class="form-group">
    <div class="toggle-switch">
      <label class="switch">
        <input type="checkbox" name="active" ${!product || product.active !== false ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <span>✅ Active</span>
    </div>
    <small style="color: #666; display: block; margin-top: 5px;">Product visible on website</small>
  </div>
</div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> ${isEditMode ? 'Update Product' : 'Save Product'}
          </button>
          <a href="/posts" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  </div>
  
  ${getAdminFooter()}

  <script>
    // ===== SIZE FUNCTIONS =====
    function addSize() {
        const sizeInput = document.getElementById('newSize');
        const stockInput = document.getElementById('newStock');
        
        if (!sizeInput || !stockInput) {
            alert('Form elements not found!');
            return;
        }
        
        const size = sizeInput.value.trim();
        const stock = parseInt(stockInput.value) || 0;
        
        if (!size) {
            alert('Please enter a size');
            return;
        }
        
        // Check if size already exists
        const existingSizes = document.querySelectorAll('input[name="size_names[]"]');
        for (let i = 0; i < existingSizes.length; i++) {
            if (existingSizes[i].value.toUpperCase() === size.toUpperCase()) {
                alert('Size ' + size + ' already exists!');
                return;
            }
        }
        
        // Add new row
        const tbody = document.getElementById('sizeStockBody');
        if (!tbody) {
            alert('Table not found!');
            return;
        }
        
        const newRow = document.createElement('tr');
        newRow.innerHTML = 
            '<td><input type="text" name="size_names[]" value="' + size.toUpperCase() + '" class="form-input" style="width:80px;" readonly></td>' +
            '<td><input type="number" name="size_stocks[]" value="' + stock + '" class="form-input" min="0" style="width:80px;" onchange="updateTotalStock()"></td>' +
            '<td><span class="stock-badge ' + (stock > 0 ? 'badge-in-stock' : 'badge-out-stock') + '">' + (stock > 0 ? 'In Stock' : 'Out of Stock') + '</span></td>' +
            '<td><button type="button" class="delete-size-btn" onclick="removeSizeRow(this)">Delete</button></td>';
        
        tbody.appendChild(newRow);
        
        // Clear inputs
        sizeInput.value = '';
        stockInput.value = '0';
        
        // Update total stock
        updateTotalStock();
    }
    
    function removeSizeRow(button) {
        if (confirm('Remove this size?')) {
            const row = button.closest('tr');
            if (row) {
                row.remove();
                updateTotalStock();
            }
        }
    }
    
    function updateTotalStock() {
        const stockInputs = document.querySelectorAll('input[name="size_stocks[]"]');
        let total = 0;
        
        stockInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        
        const totalSpan = document.getElementById('totalStock');
        const totalInput = document.getElementById('totalStockInput');
        
        if (totalSpan) totalSpan.textContent = total;
        if (totalInput) totalInput.value = total;
    }
    
    // ===== DISCOUNT FUNCTION =====
    function calculateDiscount() {
        const price = document.getElementById('price');
        const discount = document.getElementById('discount');
        const finalSpan = document.getElementById('finalPrice');
        
        if (!price || !discount || !finalSpan) return;
        
        const priceVal = parseFloat(price.value) || 0;
        const discountVal = parseFloat(discount.value) || 0;
        
        let finalPrice = priceVal;
        if (discountVal > 0) {
            finalPrice = priceVal - (priceVal * discountVal / 100);
        }
        
        finalSpan.textContent = finalPrice.toFixed(2);
    }
    
    // ===== CATEGORY FUNCTION =====
    function initCategory() {
        const categorySelect = document.getElementById('mainCategory');
        if (categorySelect) {
            categorySelect.addEventListener('change', function() {
                const newField = document.getElementById('newCategoryField');
                if (newField) {
                    newField.style.display = this.value === 'new' ? 'block' : 'none';
                }
            });
        }
    }
    
    // ===== IMAGE PREVIEW FUNCTIONS =====
    function previewNewImages(input) {
        const preview = document.getElementById('newImagePreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        if (input.files) {
            const files = Array.from(input.files);
            
            if (files.length > 5) {
                alert('Maximum 5 images allowed');
                input.value = '';
                return;
            }
            
            files.forEach((file, index) => {
                if (!file.type.startsWith('image/')) {
                    alert('Please upload only images');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const div = document.createElement('div');
                    div.style.position = 'relative';
                    div.style.display = 'inline-block';
                    div.style.margin = '0 10px 10px 0';
                    div.innerHTML = 
                        '<img src="' + e.target.result + '" style="width:100px; height:100px; object-fit:cover; border-radius:5px; border:2px solid #28a745;">' +
                        '<button type="button" onclick="this.parentElement.remove()" style="position:absolute; top:5px; right:5px; background:#dc3545; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer;">×</button>' +
                        '<div style="text-align:center; margin-top:5px; font-size:12px;">New ' + (index+1) + '</div>';
                    preview.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        }
    }
    
    function removeExistingImage(button) {
        if (confirm('Remove this image?')) {
            const item = button.closest('.existing-image-item');
            if (item) item.remove();
        }
    }
    
    // Legacy function for backward compatibility
    function previewImages(input) {
        previewNewImages(input);
    }
    
    // ===== FORM VALIDATION =====
    function initFormValidation() {
        const form = document.getElementById('productForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            const fileInput = document.getElementById('imageUpload');
            const existingImages = document.querySelectorAll('input[name="existingImages"]');
            
            if (existingImages.length === 0 && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
                e.preventDefault();
                alert('Please upload at least one image');
                return false;
            }
            
            const sizeRows = document.querySelectorAll('input[name="size_names[]"]');
            if (sizeRows.length === 0) {
                e.preventDefault();
                alert('Please add at least one size');
                return false;
            }
            
            const price = document.getElementById('price');
            if (price && parseFloat(price.value) <= 0) {
                e.preventDefault();
                alert('Please enter a valid price');
                return false;
            }
            
            return true;
        });
    }
    
    // Initialize everything when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Add Product Page Loaded');
        updateTotalStock();
        initCategory();
        initFormValidation();
        
        // Initialize price/discount listeners
        const price = document.getElementById('price');
        const discount = document.getElementById('discount');
        if (price) price.addEventListener('input', calculateDiscount);
        if (discount) discount.addEventListener('input', calculateDiscount);
    });
  </script>
</body>
</html>`);
});

// ADD/EDIT PRODUCT PROCESSING
app.post("/add-product", upload.array("images", 5), (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const posts = loadPosts();
  const categories = loadCategories();
  const editIndex = req.body.editIndex;
  
  let existingImages = [];
  if (Array.isArray(req.body.existingImages)) {
    existingImages = req.body.existingImages;
  } else if (req.body.existingImages) {
    existingImages = [req.body.existingImages];
  }
  
      const newImages = req.files ? req.files.map(f => "/uploads/" + f.filename) : [];
    const allImages = [...existingImages, ...newImages];
  
  const sizeNames = req.body.size_names || [];
  const sizeStocks = req.body.size_stocks || [];
  
  const sizeStock = {};
  let totalStock = 0;
  
  if (Array.isArray(sizeNames)) {
    sizeNames.forEach((size, index) => {
      const stock = parseInt(sizeStocks[index]) || 0;
      if (size && size.trim()) {
        sizeStock[size.trim().toUpperCase()] = stock;
        totalStock += stock;
      }
    });
  }
  
  const colors = req.body.colors ? 
    req.body.colors.split(',').map(c => c.trim()).filter(c => c) : 
    [];
  
  const originalPrice = parseFloat(req.body.price) || 0;
  const discountValue = parseFloat(req.body.discount) || 0;
  
  let finalPrice = originalPrice;
  let discount = null;
  
  if (discountValue > 0) {
    finalPrice = originalPrice - (originalPrice * discountValue / 100);
    discount = {
      type: 'percentage',
      value: discountValue
    };
    finalPrice = Math.max(0, finalPrice);
  }
  
  if (req.body.new_subcategories) {
    try {
      const newSubcats = JSON.parse(req.body.new_subcategories);
      if (req.body.category && req.body.category.trim()) {
        const newCategory = {
          id: Date.now(),
          name: req.body.category,
          slug: slugify(req.body.category),
          subcategories: newSubcats.map((sub, index) => ({
            id: Date.now() + index + 1,
            name: sub,
            slug: slugify(sub)
          }))
        };
        categories.push(newCategory);
        saveCategories(categories);
        console.log("New category added:", newCategory);
      }
    } catch (e) {
      console.error("Error parsing new subcategories:", e);
    }
  }
  
  const productData = {
    name: req.body.name,
    brand: req.body.brand || '',
    originalPrice: originalPrice,
    price: finalPrice,
    discount: discount,
    category: req.body.category || "General",
    categoryId: req.body.category_id || '',
    subcategory: req.body.subcategory || '',
    stock: totalStock,
    sizeStock: sizeStock,
    description: req.body.description || "",
    colors: colors,
    images: allImages,
    featured: req.body.featured === "on",
    showInNewArrivals: req.body.showInNewArrivals === "on",
    showInBestSellers: req.body.showInBestSellers === "on",
    active: req.body.active !== "off",
    slug: slugify(req.body.name),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (editIndex !== undefined) {
    const index = parseInt(editIndex);
    if (index >= 0 && index < posts.length) {
      productData.createdAt = posts[index].createdAt;
      posts[index] = productData;
    }
  } else {
    posts.push(productData);
  }
  
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  
  res.redirect("/posts?success=Product " + (editIndex !== undefined ? "updated" : "added") + " successfully");
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.redirect("/");
  });
});

// DELETE POST
app.post("/delete-post", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { index } = req.body;
  const posts = loadPosts();
  
  if (index >= 0 && index < posts.length) {
    posts.splice(index, 1);
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.json({ success: true });
  }
});

// ABOUT US PAGE
app.get("/about", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>About Us | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .hero-section {
      background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/uploads/about-hero.jpg');
      background-size: cover;
      color: white;
      text-align: center;
      padding: 100px 20px;
      margin-bottom: 50px;
    }
    
    .about-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .mission-vision {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin: 50px 0;
    }
    
    .mv-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .team-section {
      margin: 60px 0;
    }
    
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      margin-top: 30px;
    }
    
    .team-member {
      text-align: center;
    }
    
    .member-img {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      margin: 0 auto 20px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      color: #e53935;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 50px 0;
    }
    
    .stat-card {
      text-align: center;
      padding: 30px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
    }
    
    .stat-number {
      font-size: 48px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="hero-section">
    <h1 style="font-size: 48px; margin-bottom: 20px;">About Sports India</h1>
    <p style="font-size: 20px; max-width: 800px; margin: 0 auto;">Your trusted partner in sports excellence since 2020</p>
  </div>

  <div class="about-content">
    <section>
      <h2>Our Story</h2>
      <p>Founded in 2020, Sports India started as a small retail store in Delhi with a vision to provide high-quality sports equipment to aspiring athletes. Today, we are one of India's leading sports gear retailers and a thriving online presence.</p>
      
      <p>Our journey has been driven by a passion for sports and a commitment to helping athletes achieve their full potential. We believe that every athlete deserves access to the best equipment, regardless of their level or background.</p>
    </section>

    <div class="mission-vision">
      <div class="mv-card">
        <h3>🏆 Our Mission</h3>
        <p>To empower athletes across India by providing premium quality sports equipment, expert guidance, and exceptional service that enhances performance and fosters a lifelong love for sports.</p>
      </div>
      
      <div class="mv-card">
        <h3>👁️ Our Vision</h3>
        <p>To become India's most trusted sports brand, recognized for innovation, quality, and our contribution to developing sports culture and nurturing future champions.</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">5+</div>
        <h4>Years of Experience</h4>
      </div>
      <div class="stat-card">
        <div class="stat-number">2+</div>
        <h4>Stores Nationwide</h4>
      </div>
      <div class="stat-card">
        <div class="stat-number">1K+</div>
        <h4>Happy Customers</h4>
      </div>
      <div class="stat-card">
        <div class="stat-number">500+</div>
        <h4>Products</h4>
      </div>
    </div>

    <section class="team-section">
  <h2>Meet Our Leadership</h2>
  <div class="team-grid">
    <div class="team-member">
      <div class="member-img">
        <img src="/images/balraj-gujjar.jpg" alt="Balraj Gujjar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
      </div>
      <h3>BALRAJ GUJJAR</h3>
      <p>Founder & CEO</p>
      <p>ATHLETE AND SPORTS ENTREPRENEUR</p>
    </div>
    <!-- Baki team members -->
  </div>
</section>

    <section>
      <h2>Our Values</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px;">
        <div style="background: #fff8e1; padding: 20px; border-radius: 10px; border-left: 4px solid #ffb300;">
          <h4>🏅 Quality First</h4>
          <p>Every product undergoes rigorous quality checks to ensure it meets international standards.</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; border-left: 4px solid #4caf50;">
          <h4>🤝 Customer Trust</h4>
          <p>We build lasting relationships through transparency, honesty, and exceptional service.</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; border-left: 4px solid #2196f3;">
          <h4>🌱 Innovation</h4>
          <p>Continuously researching and developing products that enhance athletic performance.</p>
        </div>
        
        <div style="background: #f3e5f5; padding: 20px; border-radius: 10px; border-left: 4px solid #9c27b0;">
          <h4>🏋️‍♂️ Sports Promotion</h4>
          <p>Actively supporting local sports initiatives and young talent across India.</p>
        </div>
      </div>
    </section>

    <section style="margin: 60px 0; text-align: center;">
      <h2>Why Choose Sports India?</h2>
      <div style="max-width: 800px; margin: 30px auto;">
        <ul style="text-align: left; display: inline-block;">
          <li>✅ 100% Genuine Products with Manufacturer Warranty</li>
          <li>✅ Free Expert Consultation from Sports Professionals</li>
          <li>✅ 10-Day Easy Return & Exchange Policy</li>
          <li>✅ Pan-India Shipping with Cash on Delivery</li>
          
        </ul>
      </div>
    </section>
  </div>

  ${getFooter()}
</body>
</html>`);
});

function calculateTotalStock(product) {
  if (product.sizeStock) {
    return Object.values(product.sizeStock).reduce((sum, stock) => sum + stock, 0);
  }
  return product.stock || 0;
}

function adjustColor(hex, percent) {
  const fallbackColors = {
    '#4CAF50': '#8BC34A',
    '#F44336': '#FF7043',
    '#9C27B0': '#BA68C8',
    '#2196F3': '#64B5F6',
    '#FF9800': '#FFB74D',
    '#FF5722': '#FF8A65'
  };
  
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return fallbackColors[hex] || '#e53935';
  }
  
  try {
    let R = parseInt(hex.substring(1,3), 16);
    let G = parseInt(hex.substring(3,5), 16);
    let B = parseInt(hex.substring(5,7), 16);
    
    R = Math.min(255, Math.max(0, R + percent));
    G = Math.min(255, Math.max(0, G + percent));
    B = Math.min(255, Math.max(0, B + percent));
    
    return '#' + (R < 16 ? '0' : '') + R.toString(16) + 
                  (G < 16 ? '0' : '') + G.toString(16) + 
                  (B < 16 ? '0' : '') + B.toString(16);
  } catch (e) {
    return fallbackColors[hex] || '#e53935';
  }
}

function getAdminFooter() {
  return `
      </div>
    </div>
    
    <script>
      if (!document.querySelector('.fa')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
      }
      
      function showTab(tabId) {
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
          tab.style.display = 'none';
        });
        
        const tabToShow = document.getElementById(tabId);
        if (tabToShow) {
          tabToShow.style.display = 'block';
        }
      }
    </script>
  `;
}

// CONTACT US PAGE
app.get("/contact", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Contact Us | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .contact-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .contact-hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 80px 20px;
      margin-bottom: 50px;
      border-radius: 0 0 20px 20px;
    }
    
    .contact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 40px;
      margin-bottom: 60px;
    }
    
    .contact-form {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    }
    
    .contact-info {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    }
    
    .info-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    
    .info-icon {
      width: 50px;
      height: 50px;
      background: #e53935;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-right: 20px;
      flex-shrink: 0;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input, .form-textarea {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .form-textarea {
      min-height: 150px;
      resize: vertical;
    }
    
    .submit-btn {
      width: 100%;
      padding: 18px;
      background: #e53935;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .submit-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(229,57,53,0.3);
    }
    
    .store-locations {
      margin: 60px 0;
    }
    
    .store-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-top: 30px;
    }
    
    .store-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      transition: transform 0.3s;
    }
    
    .store-card:hover {
      transform: translateY(-5px);
    }
    
    .map-container {
      margin-top: 50px;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    }
    
    .faq-section {
      margin: 60px 0;
    }
    
    .faq-item {
      background: white;
      margin-bottom: 15px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
    }
    
    .faq-question {
      padding: 20px;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 600;
    }
    
    .faq-answer {
      padding: 0 20px;
      max-height: 0;
      overflow: hidden;
      transition: all 0.3s;
    }
    
    .faq-answer.show {
      padding: 20px;
      max-height: 500px;
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="contact-hero">
    <h1 style="font-size: 48px; margin-bottom: 20px;">Get in Touch</h1>
    <p style="font-size: 20px; max-width: 700px; margin: 0 auto;">We're here to help you with any questions about our products, orders, or sports expertise</p>
  </div>

  <div class="contact-container">
    <div class="contact-grid">
      <div class="contact-form">
        <h2 style="margin-top: 0; margin-bottom: 30px;">Send us a Message</h2>
        
        <form id="contactForm" method="POST" action="/submit-contact">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" name="name" class="form-input" placeholder="Enter your name" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" name="phone" class="form-input" placeholder="Enter your phone number">
          </div>
          
          <div class="form-group">
            <label class="form-label">Subject *</label>
            <select name="subject" class="form-input" required>
              <option value="">Select a subject</option>
              <option value="product-inquiry">Product Inquiry</option>
              <option value="order-issue">Order Issue</option>
              <option value="size-guide">Size Guide Help</option>
              <option value="wholesale">Wholesale Inquiry</option>
              <option value="partnership">Partnership Opportunity</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Message *</label>
            <textarea name="message" class="form-textarea" placeholder="How can we help you?" required></textarea>
          </div>
          
          <button type="submit" class="submit-btn">Send Message</button>
        </form>
      </div>
      
      <div class="contact-info">
        <h2 style="margin-top: 0; margin-bottom: 30px;">Contact Information</h2>
        
        <div class="info-item">
          <div class="info-icon">📍</div>
          <div>
            <h3 style="margin: 0 0 10px 0;">Head Office</h3>
            <p style="margin: 0; color: #666;">📍 Near Shiv Mandir Konsiwas Road, Near NH-48 , Bhudla Sangwari , Rewari , Haryana ,123401<br>
               New Delhi - 110001<br>
               India</p>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-icon">📞</div>
          <div>
            <h3 style="margin: 0 0 10px 0;">Phone Numbers</h3>
            <p style="margin: 0; color: #666;">
              Customer Care: <a href="tel:+911234567890" style="color: #e53935;">+91 9813639843</a><br>
              WhatsApp Support: <a href="https://wa.me/911234567890" style="color: #e53935;">+91 9813639843</a><br>
              
            </p>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-icon">✉️</div>
          <div>
            <h3 style="margin: 0 0 10px 0;">Email Addresses</h3>
            <p style="margin: 0; color: #666;">
              General: <a href="mailto:sportsindia9999@gmail.com" style="color: #e53935;">info@sportsindia.com</a><br>
              Support: <a href="mailto:sportsindia9999@gmail.com" style="color: #e53935;">support@sportsindia.com</a><br>
              Wholesale: <a href="mailto:sportsindia9999@gmail.com" style="color: #e53935;">sales@sportsindia.com</a>
            </p>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-icon">🕒</div>
          <div>
            <h3 style="margin: 0 0 10px 0;">Business Hours</h3>
            <p style="margin: 0; color: #666;">
              Monday - Friday: 9:00 AM - 8:00 PM<br>
              Saturday: 10:00 AM - 6:00 PM<br>
              Sunday: 11:00 AM - 4:00 PM<br>
              <small>(All times are in IST)</small>
            </p>
          </div>
        </div>
        
        <div style="margin-top: 40px;">
          <h3>Connect with us</h3>
          <div style="display: flex; gap: 15px; margin-top: 20px;">
            <a href="https://www.instagram.com/sportsindia_44?igsh=bTZrNnlkNHQxZ3M1" target="_blank" style="width: 50px; height: 50px; background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; text-decoration: none;">📸</a>
            
            <a href="https://facebook.com/sportsindia" target="_blank" style="width: 50px; height: 50px; background: #4267B2; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; text-decoration: none;">📘</a>
            
            <a href="https://twitter.com/sportsindia" target="_blank" style="width: 50px; height: 50px; background: #1DA1F2; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; text-decoration: none;">🐦</a>
            
            <a href="https://youtube.com/sportsindia" target="_blank" style="width: 50px; height: 50px; background: #FF0000; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; text-decoration: none;">▶️</a>
            
            <a href="https://linkedin.com/company/sportsindia" target="_blank" style="width: 50px; height: 50px; background: #0077B5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; text-decoration: none;">💼</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="store-locations">
      <h2>Our Store Locations</h2>
      <div class="store-grid">
        <div class="store-card">
          <h3>Delhi (Head Office)</h3>
          <p>📞 +91 11 2345 6789</p>
          <p>📍 123 Sports Complex, Connaught Place, New Delhi</p>
          <p>🕒 9:00 AM - 9:00 PM</p>
          <a href="https://maps.google.com/?q=Connaught+Place+New+Delhi" target="_blank" style="color: #e53935; text-decoration: none; font-weight: 600;">Get Directions →</a>
        </div>
        
       
        
        
    
    <div class="map-container">
      <div style="width: 100%; height: 400px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
        <div style="text-align: center;">
          <div style="font-size: 48px;">🗺️</div>
          <p>Interactive Map Loading...</p>
          <p><small>In a live site, embed Google Maps here</small></p>
        </div>
      </div>
    </div>
    
    <div class="faq-section">
      <h2>Frequently Asked Questions</h2>
      
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFAQ(this)">
          What is your return policy?
          <span style="font-size: 20px;">+</span>
        </div>
        <div class="faq-answer">
          <p>We offer a 30-day return policy for all products in original condition with tags attached. For size exchanges, we provide free return shipping within 15 days of delivery.</p>
        </div>
      </div>
      
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFAQ(this)">
          How long does shipping take?
          <span style="font-size: 20px;">+</span>
        </div>
        <div class="faq-answer">
          <p>Standard shipping takes 5-7 business days within India. Express shipping (2-3 days) is available for most locations. Shipping times may vary during festive seasons.</p>
        </div>
      </div>
      
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFAQ(this)">
          Do you offer bulk/wholesale pricing?
          <span style="font-size: 20px;">+</span>
        </div>
        <div class="faq-answer">
          <p>Yes, we offer special pricing for schools, colleges, sports clubs, and businesses. Contact our wholesale team at sales@sportsindia.com for customized quotes.</p>
        </div>
      </div>
      
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFAQ(this)">
          Can I get expert advice on choosing equipment?
          <span style="font-size: 20px;">+</span>
        </div>
        <div class="faq-answer">
          <p>Absolutely! Our team includes certified sports professionals. Book a free consultation call through our website or visit any of our stores for personalized advice.</p>
        </div>
      </div>
      
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFAQ(this)">
          Do you ship internationally?
          <span style="font-size: 20px;">+</span>
        </div>
        <div class="faq-answer">
          <p>Currently, we only ship within India. We're working on expanding our international shipping capabilities.</p>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 15px; margin: 50px 0;">
      <h2 style="margin-top: 0;">Need Immediate Assistance?</h2>
      <p style="font-size: 18px; margin-bottom: 25px;">Call our 24/7 support line for urgent order-related queries</p>
      <a href="tel:+9118001234567" style="display: inline-block; background: white; color: #e53935; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-size: 20px; font-weight: bold; transition: transform 0.3s;">📞 1800-123-4567</a>
    </div>
  </div>

  ${getFooter()}
  
  <script>
    function toggleFAQ(element) {
      const answer = element.nextElementSibling;
      const icon = element.querySelector('span');
      
      answer.classList.toggle('show');
      icon.textContent = answer.classList.contains('show') ? '−' : '+';
    }
    
    document.getElementById('contactForm').addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Thank you for your message! We will get back to you within 24 hours.');
      this.reset();
    });
  </script>
</body>
</html>`);
});

app.post("/submit-contact", (req, res) => {
  const contacts = JSON.parse(fs.readFileSync(CONTACT_FILE, "utf8"));
  
  contacts.push({
    id: Date.now(),
    ...req.body,
    date: new Date().toLocaleString(),
    status: "new"
  });
  
  fs.writeFileSync(CONTACT_FILE, JSON.stringify(contacts, null, 2));
  
  res.redirect("/contact?success=true");
});

// PRIVACY POLICY PAGE
app.get("/privacy-policy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Privacy Policy | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .policy-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .policy-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .policy-content {
      background: white;
      padding: 50px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .section {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #eee;
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .highlight-box {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 10px;
      border-left: 4px solid #e53935;
      margin: 30px 0;
    }
    
    .update-date {
      text-align: center;
      color: #666;
      font-style: italic;
      margin-top: 50px;
    }
    
    .toc {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 10px;
      margin: 30px 0;
    }
    
    .toc ul {
      columns: 2;
      list-style: none;
      padding: 0;
    }
    
    .toc li {
      margin-bottom: 10px;
    }
    
    .toc a {
      color: #e53935;
      text-decoration: none;
    }
    
    @media (max-width: 768px) {
      .toc ul {
        columns: 1;
      }
      
      .policy-content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="policy-header">
    <h1 style="font-size: 42px; margin-bottom: 20px;">Privacy Policy</h1>
    <p style="font-size: 18px; color: #666;">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="policy-container">
    <div class="policy-content">
      <div class="highlight-box">
        <p><strong>At Sports India</strong>, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
      </div>
      
      <div class="toc">
        <h3>Table of Contents</h3>
        <ul>
          <li><a href="#information-we-collect">1. Information We Collect</a></li>
          <li><a href="#how-we-use-info">2. How We Use Your Information</a></li>
          <li><a href="#cookies">3. Cookies and Tracking</a></li>
          <li><a href="#data-sharing">4. Data Sharing</a></li>
          <li><a href="#data-security">5. Data Security</a></li>
          <li><a href="#your-rights">6. Your Rights</a></li>
          <li><a href="#children-privacy">7. Children's Privacy</a></li>
          <li><a href="#changes">8. Changes to Policy</a></li>
          <li><a href="#contact">9. Contact Us</a></li>
        </ul>
      </div>
      
      <div class="section" id="information-we-collect">
        <h2>1. Information We Collect</h2>
        <h3>Personal Information</h3>
        <p>We collect personal information that you voluntarily provide when you:</p>
        <ul>
          <li>Create an account</li>
          <li>Place an order</li>
          <li>Subscribe to our newsletter</li>
          <li>Contact our customer support</li>
          <li>Participate in surveys or promotions</li>
        </ul>
        
        <p>This may include:</p>
        <ul>
          <li>Name and contact details (email, phone, address)</li>
          <li>Payment information (processed securely through payment gateways)</li>
          <li>Demographic information (age, gender, sports preferences)</li>
          <li>Communication preferences</li>
        </ul>
        
        <h3>Automatically Collected Information</h3>
        <p>When you visit our website, we automatically collect:</p>
        <ul>
          <li>IP address and device information</li>
          <li>Browser type and version</li>
          <li>Pages visited and time spent</li>
          <li>Referring website</li>
          <li>Cookies and similar technologies data</li>
        </ul>
      </div>
      
      <div class="section" id="how-we-use-info">
        <h2>2. How We Use Your Information</h2>
        <p>We use your information for the following purposes:</p>
        
        <h3>Order Processing</h3>
        <ul>
          <li>To process and fulfill your orders</li>
          <li>To send order confirmations and updates</li>
          <li>To process payments and prevent fraud</li>
          <li>To arrange delivery and returns</li>
        </ul>
        
        <h3>Customer Service</h3>
        <ul>
          <li>To respond to your inquiries and requests</li>
          <li>To provide product recommendations</li>
          <li>To offer technical support</li>
          <li>To handle complaints and feedback</li>
        </ul>
        
        <h3>Marketing & Communication</h3>
        <ul>
          <li>To send promotional offers (with your consent)</li>
          <li>To notify about new products and features</li>
          <li>To conduct surveys and research</li>
          <li>To personalize your shopping experience</li>
        </ul>
        
        <h3>Business Operations</h3>
        <ul>
          <li>To improve our website and services</li>
          <li>To analyze customer behavior and preferences</li>
          <li>To detect and prevent fraud</li>
          <li>To comply with legal obligations</li>
        </ul>
      </div>
      
      <div class="section" id="cookies">
        <h2>3. Cookies and Tracking Technologies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Remember your preferences and settings</li>
          <li>Keep you logged in during your session</li>
          <li>Track items in your shopping cart</li>
          <li>Analyze website traffic and performance</li>
          <li>Deliver targeted advertisements</li>
        </ul>
        
        <div class="highlight-box">
          <p><strong>Cookie Control:</strong> You can control cookies through your browser settings. However, disabling cookies may affect your shopping experience on our website.</p>
        </div>
        
        <p><strong>Third-party cookies:</strong> We use services from Google Analytics, Facebook Pixel, and other partners that may set their own cookies.</p>
      </div>
      
      <div class="section" id="data-sharing">
        <h2>4. Data Sharing and Disclosure</h2>
        <p>We may share your information with:</p>
        
        <h3>Service Providers</h3>
        <ul>
          <li>Payment processors (Razorpay, Stripe)</li>
          <li>Shipping and delivery partners</li>
          <li>Email marketing services</li>
          <li>Cloud hosting providers</li>
        </ul>
        
        <h3>Legal Requirements</h3>
        <p>We may disclose your information when required by law or to:</p>
        <ul>
          <li>Comply with legal processes</li>
          <li>Protect our rights and property</li>
          <li>Prevent fraud or security issues</li>
          <li>Protect the safety of our users</li>
        </ul>
        
        <h3>Business Transfers</h3>
        <p>In case of merger, acquisition, or sale of assets, your information may be transferred to the new entity.</p>
      </div>
      
      <div class="section" id="data-security">
        <h2>5. Data Security</h2>
        <p>We implement appropriate security measures including:</p>
        <ul>
          <li>SSL encryption for data transmission</li>
          <li>Secure server infrastructure</li>
          <li>Regular security audits</li>
          <li>Access controls and authentication</li>
          <li>Data encryption at rest</li>
        </ul>
        
        <div class="highlight-box">
          <p><strong>Important:</strong> While we strive to protect your personal information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>
        </div>
      </div>
      
      <div class="section" id="your-rights">
        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have the following rights:</p>
        
        <h3>Access and Correction</h3>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
        </ul>
        
        <h3>Marketing Preferences</h3>
        <ul>
          <li>Opt-out of marketing communications</li>
          <li>Unsubscribe from newsletters</li>
          <li>Adjust notification settings</li>
        </ul>
        
        <h3>Data Portability</h3>
        <ul>
          <li>Request a copy of your data</li>
          <li>Transfer data to another service</li>
        </ul>
        
        <p>To exercise these rights, contact us at <a href="mailto:privacy@sportsindia.com">privacy@sportsindia.com</a></p>
      </div>
      
      <div class="section" id="children-privacy">
        <h2>7. Children's Privacy</h2>
        <p>Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
        
        <p>If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.</p>
      </div>
      
      <div class="section" id="changes">
        <h2>8. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy periodically. We will notify you of any changes by:</p>
        <ul>
          <li>Posting the new policy on this page</li>
          <li>Sending an email notification</li>
          <li>Displaying a notice on our website</li>
        </ul>
        
        <p>We encourage you to review this policy regularly for any changes.</p>
      </div>
      
      <div class="section" id="contact">
        <h2>9. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <p><strong>Data Protection Officer</strong></p>
          <p>Sports India Pvt. Ltd.</p>
          <p>Email: <a href="mailto:privacy@sportsindia.com">privacy@sportsindia.com</a></p>
          <p>Phone: +91 11 2345 6789</p>
          <p>Address: 123 Sports Complex, Connaught Place, New Delhi - 110001</p>
        </div>
      </div>
      
      <div class="update-date">
        <p>This policy was last updated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  </div>

  ${getFooter()}
</body>
</html>`);
});

// TERMS & CONDITIONS PAGE
app.get("/terms", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Terms & Conditions | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .terms-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .terms-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .terms-content {
      background: white;
      padding: 50px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .section {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #eee;
    }
    
    .warning-box {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 25px;
      border-radius: 10px;
      margin: 30px 0;
    }
    
    .acceptance-box {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      padding: 25px;
      border-radius: 10px;
      margin: 30px 0;
      text-align: center;
    }
    
    .highlight {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #e53935;
    }
    
    @media (max-width: 768px) {
      .terms-content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="terms-header">
    <h1 style="font-size: 42px; margin-bottom: 20px;">Terms & Conditions</h1>
    <p style="font-size: 18px; color: #666;">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="terms-container">
    <div class="warning-box">
      <p style="margin: 0;"><strong>⚠️ Important:</strong> Please read these Terms & Conditions carefully before using our website. By accessing or using our services, you agree to be bound by these terms.</p>
    </div>
    
    <div class="acceptance-box">
      <p style="margin: 0; font-size: 18px;"><strong>By using Sports India's website and services, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.</strong></p>
    </div>

    <div class="terms-content">
      <div class="section">
        <h2>1. Acceptance of Terms</h2>
        <p>Welcome to Sports India. By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement.</p>
        <p>These Terms & Conditions apply to all users of the site, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content.</p>
      </div>
      
      <div class="section">
        <h2>2. Account Registration</h2>
        <h3>Eligibility</h3>
        <p>To create an account, you must:</p>
        <ul>
          <li>Be at least 13 years old</li>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your password</li>
          <li>Accept responsibility for all activities under your account</li>
        </ul>
        
        <h3>Account Termination</h3>
        <p>We reserve the right to:</p>
        <ul>
          <li>Suspend or terminate accounts that violate these terms</li>
          <li>Remove or edit content</li>
          <li>Cancel orders at our discretion</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>3. Product Information & Pricing</h2>
        <div class="highlight">
          <p><strong>Product Availability:</strong> All products are subject to availability. We reserve the right to discontinue any product at any time.</p>
        </div>
        
        <h3>Pricing</h3>
        <ul>
          <li>Prices are in Indian Rupees (₹) and include GST</li>
          <li>Prices are subject to change without notice</li>
          <li>Errors in pricing may be corrected</li>
          <li>Promotional offers have specific terms and expiry dates</li>
        </ul>
        
        <h3>Product Descriptions</h3>
        <p>We strive to provide accurate product descriptions. However, we do not warrant that product descriptions are error-free.</p>
        
        <p><strong>Color variations:</strong> Actual colors may vary due to monitor settings.</p>
      </div>
      
      <div class="section">
        <h2>4. Orders & Payments</h2>
        <h3>Order Acceptance</h3>
        <ul>
          <li>Your order constitutes an offer to purchase</li>
          <li>Acceptance occurs when we ship the product</li>
          <li>We may refuse any order for any reason</li>
          <li>Order confirmation does not guarantee availability</li>
        </ul>
        
        <h3>Payment Methods</h3>
        <p>We accept the following payment methods:</p>
        <ul>
          <li>Credit/Debit Cards</li>
          <li>Net Banking</li>
          <li>UPI Payments</li>
          <li>Cash on Delivery (conditions apply)</li>
          <li>Wallet Payments</li>
        </ul>
        
        <div class="highlight">
          <p><strong>Payment Security:</strong> All payments are processed through secure payment gateways. We do not store your credit card information.</p>
        </div>
      </div>
      
      <div class="section">
        <h2>5. Shipping & Delivery</h2>
        <h3>Delivery Timeline</h3>
        <ul>
          <li>Standard delivery: 5-7 business days</li>
          <li>Express delivery: 2-3 business days (additional charges apply)</li>
          <li>Delivery times are estimates, not guarantees</li>
        </ul>
        
        <h3>Shipping Charges</h3>
        <ul>
          <li>Free shipping on orders above ₹999</li>
          <li>Flat ₹49 shipping fee for orders below ₹999</li>
          <li>Express delivery charges vary by location</li>
        </ul>
        
        <h3>Delivery Restrictions</h3>
        <p>We currently ship only within India. Some remote locations may have additional restrictions.</p>
      </div>
      
      <div class="section">
        <h2>6. Returns, Exchanges & Refunds</h2>
        <div class="highlight">
          <p><strong>Return Policy:</strong> 30-day return policy from date of delivery. Products must be in original condition with tags and packaging.</p>
        </div>
        
        <h3>Non-Returnable Items</h3>
        <ul>
          <li>Personalized/customized products</li>
          <li>Underwear and socks</li>
          <li>Damaged or used products</li>
          <li>Products without original packaging</li>
        </ul>
        
        <h3>Refund Process</h3>
        <ul>
          <li>Refunds processed within 7-10 business days</li>
          <li>Refund method same as payment method</li>
          <li>COD orders refunded via bank transfer</li>
        </ul>
        
        <h3>Exchanges</h3>
        <p>Size exchanges are free within 15 days of delivery, subject to availability.</p>
      </div>
      
      <div class="section">
        <h2>7. Intellectual Property</h2>
        <p>All content on this website, including but not limited to:</p>
        <ul>
          <li>Text, graphics, logos, images</li>
          <li>Software and code</li>
          <li>Product designs and descriptions</li>
          <li>Brand names and trademarks</li>
        </ul>
        <p>are the property of Sports India or its licensors and are protected by intellectual property laws.</p>
        
        <p><strong>Restrictions:</strong> You may not reproduce, distribute, modify, or create derivative works without our written permission.</p>
      </div>
      
      <div class="section">
        <h2>8. User Content & Reviews</h2>
        <p>By submitting content (reviews, comments, photos), you grant us:</p>
        <ul>
          <li>A non-exclusive, royalty-free license to use the content</li>
          <li>Right to modify, publish, and distribute the content</li>
          <li>Right to use your name in connection with the content</li>
        </ul>
        
        <h3>Prohibited Content</h3>
        <p>You may not submit content that:</p>
        <ul>
          <li>Is false, misleading, or defamatory</li>
          <li>Violates any third-party rights</li>
          <li>Contains viruses or malicious code</li>
          <li>Is obscene, offensive, or illegal</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>9. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Sports India shall not be liable for:</p>
        <ul>
          <li>Any indirect, incidental, or consequential damages</li>
          <li>Loss of profits, data, or business opportunities</li>
          <li>Damages resulting from unauthorized access</li>
          <li>Product misuse or improper handling</li>
        </ul>
        
        <div class="highlight">
          <p><strong>Maximum Liability:</strong> Our maximum liability to you for any claim shall not exceed the amount you paid for the product in question.</p>
        </div>
      </div>
      
      <div class="section">
        <h2>10. Indemnification</h2>
        <p>You agree to indemnify and hold harmless Sports India, its affiliates, officers, and employees from any claims, damages, or expenses arising from:</p>
        <ul>
          <li>Your use of the website</li>
          <li>Your violation of these terms</li>
          <li>Your infringement of any rights</li>
          <li>Your conduct in connection with the service</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>11. Governing Law & Dispute Resolution</h2>
        <h3>Governing Law</h3>
        <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
        
        <h3>Jurisdiction</h3>
        <p>Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.</p>
        
        <h3>Dispute Resolution</h3>
        <p>Before filing any legal action, you agree to:</p>
        <ul>
          <li>Attempt informal resolution for 30 days</li>
          <li>Submit to mediation if requested</li>
          <li>Provide written notice of dispute</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>12. Changes to Terms</h2>
        <p>We reserve the right to:</p>
        <ul>
          <li>Update these Terms at any time</li>
          <li>Modify or discontinue the service</li>
          <li>Change pricing and policies</li>
        </ul>
        
        <p><strong>Continued Use:</strong> Your continued use of the website after changes constitutes acceptance of the new terms.</p>
      </div>
      
      <div class="section">
        <h2>13. Force Majeure</h2>
        <p>We shall not be liable for any failure to perform due to causes beyond our reasonable control, including but not limited to:</p>
        <ul>
          <li>Acts of God</li>
          <li>Natural disasters</li>
          <li>War or terrorism</li>
          <li>Labor disputes</li>
          <li>Supply chain disruptions</li>
          <li>Government actions</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>14. Severability</h2>
        <p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>
      </div>
      
      <div class="section">
        <h2>15. Contact Information</h2>
        <p>For questions about these Terms & Conditions, contact us:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <p><strong>Legal Department</strong></p>
          <p>Sports India Pvt. Ltd.</p>
          <p>Email: <a href="mailto:legal@sportsindia.com">legal@sportsindia.com</a></p>
          <p>Phone: +91 11 2345 6789</p>
          <p>Address: 123 Sports Complex, Connaught Place, New Delhi - 110001</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee;">
        <p style="color: #666;">These Terms & Conditions were last updated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>© ${new Date().getFullYear()} Sports India. All rights reserved.</p>
      </div>
    </div>
  </div>

  ${getFooter()}
</body>
</html>`);
});

// ADMIN DASHBOARD PAGE
app.get("/admin", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const posts = loadPosts();
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const sliders = loadSliders();
  const users = loadUsers();
  
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + Number(order.total || 0);
  }, 0);
  
  const recentOrders = orders.slice(-5).reverse();
  const lowStockProducts = posts.filter(p => (p.stock || 0) < 10).slice(0, 5);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard | Sports India</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
        }
        
        .stat-card:nth-child(1)::before { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-card:nth-child(2)::before { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .stat-card:nth-child(3)::before { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .stat-card:nth-child(4)::before { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        
        .stat-icon {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 24px;
            color: white;
        }
        
        .stat-card:nth-child(1) .stat-icon { background: #667eea; }
        .stat-card:nth-child(2) .stat-icon { background: #f5576c; }
        .stat-card:nth-child(3) .stat-icon { background: #4facfe; }
        .stat-card:nth-child(4) .stat-icon { background: #43e97b; }
        
        .stat-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
            color: #111;
        }
        
        .stat-label {
            font-size: 14px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-change {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .stat-change.positive { color: #28a745; }
        .stat-change.negative { color: #dc3545; }
        
        .content-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .card-title {
            font-size: 22px;
            color: #111;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .table-responsive {
            overflow-x: auto;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .table th {
            background: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #212529;
            border-bottom: 2px solid #dee2e6;
        }
        
        .table td {
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            vertical-align: middle;
        }
        
        .table tr:hover {
            background: #f8f9fa;
        }
        
        .product-image {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
        }
        
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-inactive {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .btn {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            text-decoration: none;
        }
        
        .btn-primary {
            background: #e53935;
            color: white;
        }
        .btn-primary:hover {
            background: #c62828;
            transform: translateY(-2px);
        }
        
        .btn-outline {
            background: transparent;
            border: 2px solid #e53935;
            color: #e53935;
        }
        .btn-outline:hover {
            background: #e53935;
            color: white;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 13px;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .quick-action {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            transition: all 0.3s;
            text-decoration: none;
            color: #212529;
        }
        
        .quick-action:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        
        .quick-action-icon {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 30px;
            color: white;
        }
        
        .page-header {
            margin-bottom: 30px;
        }
        
        .page-header h1 {
            font-size: 32px;
            color: #111;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .page-header p {
            color: #6c757d;
        }
        
        @media (max-width: 992px) {
            .admin-container {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                height: auto;
                position: static;
                border-right: none;
                border-bottom: 1px solid #e9ecef;
            }
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .admin-header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .header-actions {
                flex-wrap: wrap;
                justify-content: center;
            }
        }
        
        @media (max-width: 576px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .quick-actions {
                grid-template-columns: 1fr;
            }
            
            .main-content {
                padding: 20px;
            }
            
            .content-card {
                padding: 20px;
            }
            
            .action-buttons {
                flex-direction: column;
            }
        }
    </style>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    ${getAdminHeader(req)}
    
    <div class="page-header">
        <h1><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h1>
        <p>Welcome back, ${req.session.userName || 'Admin'}! Here's what's happening with your store today.</p>
    </div>

    <div class="quick-actions">
        <a href="/admin/add-slider" class="quick-action">
            <div class="quick-action-icon">
                <i class="fas fa-plus"></i>
            </div>
            <h3>Add Slider</h3>
            <p>Add new homepage slider</p>
        </a>
        
        <a href="/add-product" class="quick-action">
            <div class="quick-action-icon">
                <i class="fas fa-box"></i>
            </div>
            <h3>Add Product</h3>
            <p>Create new product listing</p>
        </a>
        
        <a href="/admin/analytics" class="quick-action">
            <div class="quick-action-icon">
                <i class="fas fa-chart-bar"></i>
            </div>
            <h3>View Analytics</h3>
            <p>See store performance</p>
        </a>
        
        <a href="/admin/orders" class="quick-action">
            <div class="quick-action-icon">
                <i class="fas fa-shopping-cart"></i>
            </div>
            <h3>Manage Orders</h3>
            <p>Process customer orders</p>
        </a>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-rupee-sign"></i>
            </div>
            <div class="stat-value">₹${totalRevenue.toLocaleString()}</div>
            <div class="stat-label">Total Revenue</div>
            <div class="stat-change positive">
                <i class="fas fa-arrow-up"></i>
                <span>12% from last month</span>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-shopping-cart"></i>
            </div>
            <div class="stat-value">${orders.length}</div>
            <div class="stat-label">Total Orders</div>
            <div class="stat-change positive">
                <i class="fas fa-arrow-up"></i>
                <span>8% from last month</span>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-box"></i>
            </div>
            <div class="stat-value">${posts.length}</div>
            <div class="stat-label">Total Products</div>
            <div class="stat-change positive">
                <i class="fas fa-arrow-up"></i>
                <span>5% from last month</span>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-value">${users.length}</div>
            <div class="stat-label">Total Customers</div>
            <div class="stat-change positive">
                <i class="fas fa-arrow-up"></i>
                <span>15% from last month</span>
            </div>
        </div>
    </div>

    <div class="content-card">
        <div class="card-header">
            <h2 class="card-title"><i class="fas fa-clock"></i> Recent Orders</h2>
            <a href="/admin/orders" class="btn btn-outline">View All</a>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentOrders.map(order => `
                    <tr>
                        <td>#${order.id || 'N/A'}</td>
                        <td>
                            <div style="font-weight: 600;">${order.customerName || 'Guest'}</div>
                            <small style="color: #6c757d;">${order.email || ''}</small>
                        </td>
                        <td>${order.date || new Date().toLocaleDateString()}</td>
                        <td style="font-weight: 600; color: #e53935;">₹${order.total || 0}</td>
                        <td>
                            <span class="status-badge status-active">Completed</span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <a href="/order/${order.id}" class="btn btn-sm btn-primary">
                                    <i class="fas fa-eye"></i>
                                </a>
                            </div>
                        </td>
                    </tr>
                    `).join('')}
                    
                    ${orders.length === 0 ? `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-shopping-cart" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                            <h3>No Orders Yet</h3>
                            <p>Your store hasn't received any orders yet.</p>
                        </td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    </div>

    <div class="content-card">
        <div class="card-header">
            <h2 class="card-title"><i class="fas fa-exclamation-triangle"></i> Low Stock Products</h2>
            <a href="/posts" class="btn btn-outline">Manage Products</a>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowStockProducts.map((product, i) => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${product.images && product.images[0] ? `
                                <img src="${product.images[0]}" class="product-image">
                                ` : `
                                <div style="width: 60px; height: 60px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-box" style="color: #6c757d;"></i>
                                </div>
                                `}
                                <div>
                                    <div style="font-weight: 600;">${product.name}</div>
                                    <small style="color: #6c757d;">SKU: ${product.slug}</small>
                                </div>
                            </div>
                        </td>
                        <td>${product.category || 'General'}</td>
                        <td>
                            <div style="font-weight: 600; color: ${(product.stock || 0) < 5 ? '#dc3545' : '#ffc107'};">${product.stock || 0}</div>
                        </td>
                        <td style="font-weight: 600;">₹${product.price || 0}</td>
                        <td>
                            <span class="status-badge ${(product.stock || 0) > 0 ? 'status-active' : 'status-inactive'}">
                                ${(product.stock || 0) > 0 ? 'Low Stock' : 'Out of Stock'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <a href="/add-product?edit=${i}" class="btn btn-sm btn-primary">
                                    <i class="fas fa-edit"></i>
                                </a>
                            </div>
                        </td>
                    </tr>
                    `).join('')}
                    
                    ${lowStockProducts.length === 0 ? `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-check-circle" style="font-size: 40px; margin-bottom: 15px; color: #28a745; opacity: 0.3;"></i>
                            <h3>All Products in Stock</h3>
                            <p>All your products have sufficient stock levels.</p>
                        </td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    </div>

    ${getAdminFooter()}
    
    <script>
        function updateTime() {
            const timeElements = document.querySelectorAll('.current-time');
            const now = new Date();
            timeElements.forEach(el => {
                el.textContent = now.toLocaleTimeString();
            });
        }
        
        setInterval(updateTime, 60000);
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Admin dashboard loaded');
        });
    </script>
</body>
</html>`);
});

// ADD SLIDER PAGE (ADMIN)
app.get("/admin/add-slider", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const sliders = loadSliders();
  const isEditMode = req.query.edit !== undefined;
  let slider = null;
  
  if (isEditMode) {
    const editIndex = parseInt(req.query.edit);
    if (editIndex >= 0 && editIndex < sliders.length) {
      slider = sliders[editIndex];
    }
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${isEditMode ? 'Edit Slider' : 'Add Slider'} | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .slider-form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .form-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    
    .form-label.required::after {
      content: " *";
      color: #e53935;
    }
    
    .form-input, .form-textarea, .form-select {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
      font-family: inherit;
    }
    
    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .form-textarea {
      min-height: 100px;
      resize: vertical;
    }
    
    .file-upload {
      position: relative;
      overflow: hidden;
      display: inline-block;
      width: 100%;
    }
    
    .file-upload input[type="file"] {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    
    .file-upload-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px 20px;
      border: 2px dashed #ced4da;
      border-radius: 10px;
      background: #f8f9fa;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .file-upload-label:hover {
      border-color: #e53935;
      background: #f0f0f0;
    }
    
    .file-upload-label i {
      font-size: 48px;
      color: #6c757d;
      margin-bottom: 15px;
    }
    
    .image-preview {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    
    .preview-image {
      width: 150px;
      height: 100px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #ddd;
    }
    
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #eee;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-primary:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #e53935;
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .form-actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="slider-form-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas ${isEditMode ? 'fa-edit' : 'fa-plus'}"></i> 
          ${isEditMode ? 'Edit Slider' : 'Add New Slider'}
        </h1>
        <p style="color: #666; margin-top: 5px;">
          ${isEditMode ? 'Update slider details' : 'Create a new homepage slider'}
        </p>
      </div>
      
      <div>
        <a href="/admin/sliders" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back to Sliders
        </a>
      </div>
    </div>
    
    <div class="form-card">
      <form method="POST" action="/admin/save-slider" enctype="multipart/form-data" id="sliderForm">
        ${isEditMode ? `<input type="hidden" name="editIndex" value="${req.query.edit}">` : ''}
        
        <div class="form-group">
          <label class="form-label required">Slider Title</label>
          <input type="text" name="title" class="form-input" 
                 placeholder="Enter slider title" 
                 value="${slider ? slider.title : ''}" 
                 required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Subtitle/Description</label>
          <textarea name="description" class="form-textarea" 
                    placeholder="Enter slider description...">${slider ? slider.description : ''}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Button Text</label>
          <input type="text" name="buttonText" class="form-input" 
                 placeholder="e.g., Shop Now, Learn More"
                 value="${slider ? slider.buttonText : 'Shop Now'}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Button Link</label>
          <input type="text" name="buttonLink" class="form-input" 
                 placeholder="e.g., /products/filter?category=Running"
                 value="${slider ? slider.buttonLink : ''}">
        </div>
        
        <div class="form-group">
          <label class="form-label required">Slider Image</label>
          <div class="file-upload">
            <div class="file-upload-label" onclick="document.getElementById('imageInput').click()">
              <i class="fas fa-cloud-upload-alt"></i>
              <span style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">
                Click to upload image
              </span>
              <span style="color: #666; text-align: center;">
                Recommended size: 1920×600px (JPG, PNG, GIF)<br>
                Max file size: 5MB
              </span>
            </div>
            <input type="file" name="image" id="imageInput" 
                   accept="image/*" 
                   ${!isEditMode ? 'required' : ''}
                   onchange="previewImage(this)">
          </div>
          
          <div class="image-preview" id="imagePreview">
            ${slider && slider.image ? `
            <div style="position: relative;">
              <img src="${slider.image}" class="preview-image">
              <input type="hidden" name="existingImage" value="${slider.image}">
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Display Order</label>
          <input type="number" name="order" class="form-input" 
                 placeholder="Lower number shows first"
                 value="${slider ? slider.order : sliders.length}" 
                 min="1">
        </div>
        
        <div class="form-group">
          <label class="form-label">Status</label>
          <div class="toggle-switch">
            <label class="switch">
              <input type="checkbox" name="active" ${!slider || slider.active !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Active (visible on homepage)</span>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> 
            ${isEditMode ? 'Update Slider' : 'Save Slider'}
          </button>
          <a href="/admin/sliders" class="btn btn-secondary">
            <i class="fas fa-times"></i> Cancel
          </a>
        </div>
      </form>
    </div>
  </div>
  
  ${getAdminFooter()}
  
  <script>
    function previewImage(input) {
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = '';
      
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'preview-image';
          preview.appendChild(img);
        };
        reader.readAsDataURL(input.files[0]);
      }
    }
  </script>
</body>
</html>`);
});

// SAVE SLIDER (ADMIN)
app.post("/admin/save-slider", upload.single("image"), (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const sliders = loadSliders();
  const editIndex = req.body.editIndex;
  
  let imagePath = req.body.existingImage;
  if (req.file) {
    imagePath = "/uploads/" + req.file.filename;
  }
  
  const sliderData = {
    title: req.body.title,
    description: req.body.description || "",
    buttonText: req.body.buttonText || "Shop Now",
    buttonLink: req.body.buttonLink || "#",
    image: imagePath,
    order: parseInt(req.body.order) || sliders.length + 1,
    active: req.body.active === "on",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (editIndex !== undefined) {
    const index = parseInt(editIndex);
    if (index >= 0 && index < sliders.length) {
      sliderData.createdAt = sliders[index].createdAt;
      sliders[index] = sliderData;
    }
  } else {
    sliders.push(sliderData);
  }
  
  sliders.sort((a, b) => (a.order || 999) - (b.order || 999));
  
  fs.writeFileSync(SLIDER_FILE, JSON.stringify(sliders, null, 2));
  
  res.redirect("/admin/sliders?success=Slider " + (editIndex !== undefined ? "updated" : "added") + " successfully");
});

// MANAGE SLIDERS PAGE (ADMIN)
app.get("/admin/sliders", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const sliders = loadSliders();
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Manage Sliders | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .sliders-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .sliders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .slider-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: all 0.3s;
      position: relative;
    }
    
    .slider-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    }
    
    .slider-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .slider-content {
      padding: 25px;
    }
    
    .slider-title {
      font-size: 20px;
      margin: 0 0 10px 0;
      color: #111;
    }
    
    .slider-status {
      position: absolute;
      top: 15px;
      right: 15px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .status-active {
      background: #d4edda;
      color: #155724;
    }
    
    .status-inactive {
      background: #f8d7da;
      color: #721c24;
    }
    
    .slider-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .btn {
      padding: 10px 15px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      grid-column: 1 / -1;
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .sliders-grid {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="sliders-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-images"></i> Manage Homepage Sliders
        </h1>
        <p style="color: #666; margin-top: 5px;">Total: ${sliders.length} sliders</p>
      </div>
      
      <div>
        <a href="/admin/add-slider" class="btn btn-primary">
          <i class="fas fa-plus"></i> Add New Slider
        </a>
      </div>
    </div>
    
    ${sliders.length === 0 ? `
    <div class="empty-state">
      <div style="font-size: 80px; margin-bottom: 30px; color: #ddd;">
        <i class="fas fa-images"></i>
      </div>
      <h2 style="margin-bottom: 20px;">No sliders found</h2>
      <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
        Get started by adding your first homepage slider to showcase featured products or promotions.
      </p>
      <a href="/admin/add-slider" class="btn btn-primary" style="font-size: 16px; padding: 15px 30px;">
        <i class="fas fa-plus"></i> Add First Slider
      </a>
    </div>
    ` : `
    <div class="sliders-grid">
      ${sliders.map((slider, index) => `
      <div class="slider-card">
        <div class="slider-status ${slider.active ? 'status-active' : 'status-inactive'}">
          ${slider.active ? 'Active' : 'Inactive'}
        </div>
        
        <img src="${slider.image}" class="slider-image" alt="${slider.title}">
        
        <div class="slider-content">
          <h3 class="slider-title">${slider.title}</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 15px; line-height: 1.5;">
            ${slider.description || 'No description'}
          </p>
          
          <div style="display: flex; gap: 15px; font-size: 14px; color: #666; margin-bottom: 15px;">
            <div>
              <i class="fas fa-sort-numeric-down"></i> Order: ${slider.order || 'N/A'}
            </div>
            <div>
              <i class="fas fa-link"></i> ${slider.buttonText || 'No button'}
            </div>
          </div>
          
          <div class="slider-actions">
            <a href="/admin/add-slider?edit=${index}" class="btn btn-primary">
              <i class="fas fa-edit"></i> Edit
            </a>
            <button onclick="deleteSlider(${index})" class="btn btn-danger">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
      `).join('')}
    </div>
    `}
  </div>
  
  ${getAdminFooter()}
  
  <script>
    function deleteSlider(index) {
      if (confirm('Are you sure you want to delete this slider? This action cannot be undone.')) {
        fetch('/admin/delete-slider', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ index: index })
        })
        .then(response => {
          if (response.ok) {
            location.reload();
          } else {
            alert('Error deleting slider');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Network error - please try again');
        });
      }
    }
  </script>
</body>
</html>`);
});

// DELETE SLIDER (ADMIN)
app.post("/admin/delete-slider", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { index } = req.body;
  const sliders = loadSliders();
  
  if (index >= 0 && index < sliders.length) {
    sliders.splice(index, 1);
    fs.writeFileSync(SLIDER_FILE, JSON.stringify(sliders, null, 2));
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid index" });
  }
});

// PRODUCT DETAIL PAGE
app.get("/product/:slug", (req, res) => {
  const products = loadPosts();
  const product = products.find(p => p.slug === req.params.slug);
  
  if (!product) {
    return res.redirect("/");
  }
  
  const relatedProducts = products
    .filter(p => p.slug !== product.slug && p.category === product.category)
    .slice(0, 4);
  
  const reviews = loadReviews().filter(r => r.productSlug === req.params.slug);
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${product.name} | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .product-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .product-main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-bottom: 60px;
    }
    
    .product-images {
      position: sticky;
      top: 20px;
    }
    
    .main-image {
      width: 100%;
      height: 500px;
      object-fit: contain;
      background: #f8f9fa;
      border-radius: 15px;
      margin-bottom: 20px;
      border: 1px solid #eee;
    }
    
    .thumbnail-images {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 10px;
      margin-top: 15px;
    }
    
    .thumbnail {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }
    
    .thumbnail:hover {
      transform: scale(1.05);
      border-color: #e53935;
    }
    
    .thumbnail.active {
      border-color: #e53935;
      transform: scale(1.05);
    }
    
    .product-info h1 {
      font-size: 32px;
      margin: 0 0 15px 0;
    }
    
    .product-price {
      font-size: 36px;
      color: #e53935;
      font-weight: bold;
      margin: 20px 0;
    }
    
    .product-meta {
      display: flex;
      gap: 20px;
      margin: 20px 0;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    
    .product-stock {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .stock-in { color: #28a745; }
    .stock-out { color: #dc3545; }
    
    .product-actions {
      display: flex;
      gap: 15px;
      margin: 30px 0;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s;
      border: none;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
      flex: 2;
    }
    
    .btn-primary:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
      flex: 1;
    }
    
    .product-details {
      margin-top: 40px;
    }
    
    .tabs {
      display: flex;
      border-bottom: 2px solid #eee;
      margin-bottom: 30px;
    }
    
    .tab {
      padding: 15px 30px;
      background: none;
      border: none;
      font-size: 16px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      position: relative;
    }
    
    .tab.active {
      color: #e53935;
    }
    
    .tab.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: #e53935;
    }
    
    .tab-content {
      padding: 30px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .related-products {
      margin: 60px 0;
    }
    
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 30px;
      margin-top: 30px;
    }
    
    .size-options {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 20px 0;
    }
    
    .size-option {
      min-width: 60px;
      height: 40px;
      border: 2px solid #ddd;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 600;
      padding: 0 10px;
    }
    
    .size-option.selected {
      border-color: #e53935;
      background: #e53935;
      color: white;
    }
      .size-option.out-of-stock {
  background: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
  opacity: 0.5;
  cursor: not-allowed;
}

.size-option.out-of-stock:hover {
  transform: none;
  border-color: #f5c6cb;
}
    
    .color-options {
      display: flex;
      gap: 15px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    
    .color-option {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid transparent;
    }
    
    .color-option.selected {
      border-color: #333;
      transform: scale(1.1);
    }
    
    .quantity-selector {
      display: flex;
      align-items: center;
      gap: 15px;
      margin: 20px 0;
    }
    
    .quantity-btn {
      width: 40px;
      height: 40px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
    }
    
    .rating-summary {
      display: flex;
      align-items: center;
      gap: 20px;
      margin: 20px 0;
    }
    
    .average-rating {
      font-size: 48px;
      font-weight: bold;
      color: #e53935;
    }
    
    @media (max-width: 992px) {
      .product-main {
        grid-template-columns: 1fr;
        gap: 30px;
      }
      
      .product-images {
        position: static;
      }
      
      .main-image {
        height: 400px;
      }
    }
    
    @media (max-width: 576px) {
      .product-actions {
        flex-direction: column;
      }
      
      .product-meta {
        flex-direction: column;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="product-detail-container">
    <div style="margin: 30px 0;">
      <a href="/" style="color: #666; text-decoration: none;">Home</a> 
      <span style="color: #666;"> › </span>
      <a href="/products/filter?category=${product.category}" style="color: #666; text-decoration: none;">${product.category}</a>
      <span style="color: #666;"> › </span>
      <span style="color: #333; font-weight: 600;">${product.name}</span>
    </div>

    <div class="product-main">
      <div class="product-images">
        <div id="mainImageContainer">
          ${product.images && product.images.length > 0 ? `
          <img src="${product.images[0]}" class="main-image" id="mainImage" 
               onerror="this.src=''; this.parentElement.innerHTML='<div class=\\'main-image\\' style=\\'display: flex; align-items: center; justify-content: center;\\'><div style=\\'text-align: center;\\'><div style=\\'font-size: 72px;\\'>🏏</div><div>No Image Available</div></div></div>'">
          ` : `
          <div class="main-image" style="display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
              <div style="font-size: 72px;">🏏</div>
              <div>No Image Available</div>
            </div>
          </div>
          `}
        </div>
        
        ${product.images && product.images.length > 1 ? `
        <div class="thumbnail-images">
          ${product.images.map((img, index) => `
          <img src="${img}" class="thumbnail ${index === 0 ? 'active' : ''}" 
               onclick="changeMainImage('${img}', this)" 
               data-index="${index}"
               onerror="this.src=''; this.style.display='none';">
          `).join('')}
        </div>
        ` : product.images && product.images.length === 1 ? `
        ` : ''}
        
        ${!product.images || product.images.length === 0 ? `
        <div style="text-align: center; color: #999; padding: 20px;">
          <p>No images available for this product</p>
        </div>
        ` : ''}
      </div>

      <div class="product-info">
          <h1>${product.name || 'Product Name'}</h1>
  
  ${product.brand ? `
  <div style="margin: 10px 0; color: #666;">
    <strong>Brand:</strong> ${product.brand}
  </div>
  ` : ''}
        
        <div class="rating-summary">
          <div class="average-rating">${averageRating}</div>
          <div>
            <div style="font-size: 20px; color: #ffc107;">
              ${getStarRating(averageRating)}
            </div>
            <div>
              <a href="/product/${product.slug}/reviews" style="color: #e53935;">
                ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}
              </a>
            </div>
          </div>
        </div>
        
        <div class="product-price">₹ ${product.price}</div>
        
        <div class="product-meta">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-tag"></i>
            <span>Category: <strong>${product.category}</strong></span>
          </div>
          
          <div class="product-stock ${(product.stock || 0) > 0 ? 'stock-in' : 'stock-out'}">
            <i class="fas ${(product.stock || 0) > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            ${(product.stock || 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </div>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin: 20px 0;">
          ${product.description || 'No description available.'}
        </p>
        
        ${product.sizeStock && Object.keys(product.sizeStock).length > 0 ? `
<div>
  <h3>Select Size</h3>
  <div class="size-options">
    ${Object.entries(product.sizeStock).map(([size, stock]) => `
    <div class="size-option ${stock <= 0 ? 'out-of-stock' : ''}" 
         onclick="${stock > 0 ? `selectSize('${size}')` : 'return false'}" 
         style="${stock <= 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
      ${size} ${stock > 0 ? `(${stock} in stock)` : '(Out of Stock)'}
    </div>
    `).join('')}
  </div>
</div>
` : ''}
        
        ${product.colors && product.colors.length > 0 ? `
        <div>
          <h3>Available Colors</h3>
          <div class="color-options">
            ${product.colors.map((color, index) => `
            <div class="color-option" style="background: ${color.toLowerCase()};" 
                 onclick="selectColor('${color}', ${index})" 
                 title="${color}"></div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="quantity-selector">
          <h3 style="margin: 0;">Quantity:</h3>
          <button class="quantity-btn" onclick="updateQuantity(-1)">-</button>
          <span id="quantity" style="font-size: 18px; font-weight: 600; padding: 0 20px;">1</span>
          <button class="quantity-btn" onclick="updateQuantity(1)">+</button>
        </div>
        
        <div class="product-actions">
          <button class="btn btn-primary" onclick="addToCart()">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <button class="btn btn-outline" onclick="addToWishlist()">
            <i class="fas fa-heart"></i> Wishlist
          </button>
        </div>
        
        <div style="display: flex; gap: 15px; margin-top: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-truck" style="color: #28a745;"></i>
            <div>
              <div style="font-weight: 600;">Free Shipping</div>
              <small style="color: #666;">On orders above ₹999</small>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-undo" style="color: #17a2b8;"></i>
            <div>
              <div style="font-weight: 600;">30-Day Returns</div>
              <small style="color: #666;">Easy return policy</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="product-details">
      <div class="tabs">
        <button class="tab active" onclick="showTab('description')">Description</button>
        <button class="tab" onclick="showTab('specifications')">Specifications</button>
        <button class="tab" onclick="showTab('reviews')">Reviews (${reviews.length})</button>
      </div>
      
      <div id="description" class="tab-content">
        <h3>Product Description</h3>
        <p style="line-height: 1.8;">${product.description || 'No detailed description available.'}</p>
      </div>
      
      <div id="specifications" class="tab-content" style="display: none;">
        <h3>Product Specifications</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
          <div>
            <div style="font-weight: 600; color: #666;">Category</div>
            <div>${product.category || 'N/A'}</div>
          </div>
          ${product.sizes && product.sizes.length > 0 ? `
          <div>
            <div style="font-weight: 600; color: #666;">Available Sizes</div>
            <div>${product.sizes.join(', ')}</div>
          </div>
          ` : ''}
          ${product.colors && product.colors.length > 0 ? `
          <div>
            <div style="font-weight: 600; color: #666;">Available Colors</div>
            <div>${product.colors.join(', ')}</div>
          </div>
          ` : ''}
          <div>
            <div style="font-weight: 600; color: #666;">Stock Status</div>
            <div>${(product.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}</div>
          </div>
        </div>
      </div>
      
      <div id="reviews" class="tab-content" style="display: none;">
        <h3>Customer Reviews</h3>
        ${reviews.length === 0 ? `
        <p>No reviews yet. Be the first to review this product!</p>
        ` : `
        <div style="margin-top: 20px;">
          ${reviews.slice(0, 3).map(review => `
          <div style="padding: 20px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div style="font-weight: 600;">${review.name}</div>
              <div style="color: #ffc107;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            </div>
            <p>${review.comment || 'No comment'}</p>
            <div style="font-size: 14px; color: #666;">${review.date}</div>
          </div>
          `).join('')}
        </div>
        `}
        <div style="text-align: center; margin-top: 30px;">
          <a href="/product/${product.slug}/reviews" class="btn btn-outline">
            ${reviews.length === 0 ? 'Write First Review' : 'View All Reviews'}
          </a>
        </div>
      </div>
    </div>

    ${relatedProducts.length > 0 ? `
    <div class="related-products">
      <h2>Related Products</h2>
      <div class="related-grid">
        ${relatedProducts.map(related => `
        <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <a href="/product/${related.slug}" style="text-decoration: none; color: inherit;">
            ${related.images && related.images[0] ? `
            <img src="${related.images[0]}" style="width: 100%; height: 200px; object-fit: cover;">
            ` : `
            <div style="width: 100%; height: 200px; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
              <div style="text-align: center;">
                <div style="font-size: 48px;">🏏</div>
                <small>No Image</small>
              </div>
            </div>
            `}
            <div style="padding: 20px;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px;">${related.name}</h3>
              <div style="font-size: 20px; color: #e53935; font-weight: bold;">₹ ${related.price}</div>
              <div style="font-size: 14px; color: #666; margin-top: 5px;">${related.category}</div>
            </div>
          </a>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>
  ${getFooter()}
  <script>
// Function to change main image when thumbnail is clicked
function changeMainImage(imageSrc, thumbnailElement) {
    // Get the main image element
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        // Change the main image
        mainImage.src = imageSrc;
    }
    
    // Remove active class from all thumbnails
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    
    // Add active class to clicked thumbnail
    if (thumbnailElement) {
        thumbnailElement.classList.add('active');
    }
}

// Function to update quantity
function updateQuantity(change) {
    const quantitySpan = document.getElementById('quantity');
    if (quantitySpan) {
        let quantity = parseInt(quantitySpan.textContent) || 1;
        quantity += change;
        if (quantity < 1) quantity = 1;
        quantitySpan.textContent = quantity;
    }
}

// Function to add to cart
function addToCart() {
    const slug = window.location.pathname.split('/').pop();
    const quantitySpan = document.getElementById('quantity');
    const quantity = quantitySpan ? parseInt(quantitySpan.textContent) || 1 : 1;
    
    fetch('/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, quantity })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Product added to cart!');
        } else {
            alert('Error adding to cart');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error adding to cart');
    });
}

// Function to add to wishlist
function addToWishlist() {
    const slug = window.location.pathname.split('/').pop();
    
    fetch('/add-to-wishlist/' + slug, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Added to wishlist!');
            } else {
                alert(data.message || 'Please login to add to wishlist');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding to wishlist');
        });
}

// Function to select size
function selectSize(size) {
    // Remove selected class from all size options
    document.querySelectorAll('.size-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked size
    event.target.classList.add('selected');
}

// Function to select color
function selectColor(color, index) {
    // Remove selected class from all color options
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked color
    event.target.classList.add('selected');
}

// Function to show tabs
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Product page loaded');
    
    // Set up quantity buttons if they exist
    const quantitySpan = document.getElementById('quantity');
    if (quantitySpan) {
        const minusBtn = document.querySelector('.quantity-btn:first-of-type');
        const plusBtn = document.querySelector('.quantity-btn:last-of-type');
        
        if (minusBtn) {
            minusBtn.onclick = () => updateQuantity(-1);
        }
        if (plusBtn) {
            plusBtn.onclick = () => updateQuantity(1);
        }
    }
});
</script>

</body>
</html>`);
});

// ADD TO CART ENDPOINT
app.post("/add-to-cart", (req, res) => {
  const { slug, quantity = 1, size, color } = req.body;
  console.log("Adding to cart (regular):", { slug, quantity, size, color });
  
  const products = loadPosts();
  const product = products.find(p => p.slug === slug);
  
  if (!product) {
    console.log("Product not found:", slug);
    return res.json({ success: false, error: "Product not found" });
  }
  
  // Initialize cart if it doesn't exist
  if (!req.session.cart) {
    req.session.cart = [];
  }
  
  // Check if product already in cart (consider size/color variations)
  const existingIndex = req.session.cart.findIndex(item => 
    item.slug === slug && item.size === size && item.color === color
  );
  
  if (existingIndex >= 0) {
    // Update quantity
    req.session.cart[existingIndex].quantity += quantity;
    console.log("Updated existing item:", req.session.cart[existingIndex]);
  } else {
    // Add new item with ALL product data
    const cartItem = {
      slug: product.slug,
      name: product.name || 'Product',
      price: parseFloat(product.price) || 0,
      originalPrice: product.originalPrice || product.price,
      quantity: quantity,
      image: (product.images && product.images.length > 0) ? product.images[0] : null,
      category: product.category || 'General',
      brand: product.brand || '',
      size: size || null,
      color: color || null,
      addedAt: new Date().toISOString()
    };
    
    req.session.cart.push(cartItem);
    console.log("Added new item:", cartItem);
  }
  
  // Save session explicitly
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.json({ success: false, error: "Failed to save cart" });
    }
    
    res.json({ 
      success: true, 
      cartCount: req.session.cart.length 
    });
  });
});

// ADMIN ANALYTICS PAGE
app.get("/admin/analytics", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const users = loadUsers();
  const products = loadPosts();
  const reviews = loadReviews();
  const contacts = JSON.parse(fs.readFileSync(CONTACT_FILE, "utf8"));
  
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  
  const statusCounts = {
    processing: orders.filter(o => o.orderStatus === 'processing').length,
    completed: orders.filter(o => o.orderStatus === 'completed').length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length
  };
  
  const monthlyData = getMonthlyOrderData(orders);
  const topProducts = getTopProducts(orders, products);
  const userGrowth = getUserGrowth(users);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Analytics Dashboard | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .analytics-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }
    
    .analytics-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
    }
    
    .card-title {
      font-size: 18px;
      color: #111;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 5px;
      color: #111;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .stat-change {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 14px;
      margin-top: 10px;
    }
    
    .stat-change.positive { color: #28a745; }
    .stat-change.negative { color: #dc3545; }
    
    .chart-container {
      height: 300px;
      margin-top: 20px;
    }
    
    .status-indicators {
      display: flex;
      gap: 15px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .status-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    .data-table th {
      background: #f8f9fa;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #212529;
      border-bottom: 2px solid #dee2e6;
    }
    
    .data-table td {
      padding: 15px;
      border-bottom: 1px solid #dee2e6;
      vertical-align: middle;
    }
    
    .data-table tr:hover {
      background: #f8f9fa;
    }
    
    .progress-bar {
      height: 10px;
      background: #e9ecef;
      border-radius: 5px;
      overflow: hidden;
      margin-top: 5px;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 5px;
    }
    
    .time-filters {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .time-filter {
      padding: 10px 20px;
      border: 2px solid #e1e5e9;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    
    .time-filter.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    .metric-card {
      text-align: center;
      padding: 25px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }
    
    .metric-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 24px;
      color: white;
    }
    
    .metric-card:nth-child(1) .metric-icon { background: #667eea; }
    .metric-card:nth-child(2) .metric-icon { background: #f5576c; }
    .metric-card:nth-child(3) .metric-icon { background: #4facfe; }
    .metric-card:nth-child(4) .metric-icon { background: #43e97b; }
    .metric-card:nth-child(5) .metric-icon { background: #fa709a; }
    .metric-card:nth-child(6) .metric-icon { background: #fee140; }
    
    @media (max-width: 768px) {
      .analytics-grid {
        grid-template-columns: 1fr;
      }
      
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .time-filters {
        flex-wrap: wrap;
      }
    }
  </style>
  
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="analytics-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-chart-line"></i> Analytics Dashboard
        </h1>
        <p style="color: #666; margin-top: 5px;">Store performance insights and metrics</p>
      </div>
      
      <div style="display: flex; gap: 15px;">
        <select style="padding: 10px 15px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 14px;">
          <option>Last 7 days</option>
          <option selected>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This year</option>
          <option>All time</option>
        </select>
        
        <button onclick="exportAnalytics()" style="background: #e53935; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
          <i class="fas fa-download"></i> Export
        </button>
      </div>
    </div>
    
<!-- Key Metrics -->
<div class="analytics-grid">
    <div class="metric-card">
        <div class="metric-icon">
            <i class="fas fa-rupee-sign"></i>
        </div>
        <div class="stat-number">₹${orders.length > 0 ? totalRevenue.toLocaleString() : '0'}</div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-change ${orders.length > 0 ? 'positive' : ''}">
            <i class="fas fa-arrow-${orders.length > 0 ? 'up' : 'right'}"></i>
            <span>${orders.length > 0 ? '15.2%' : '0%'} from last period</span>
        </div>
    </div>
    
    <div class="metric-card">
        <div class="metric-icon">
            <i class="fas fa-shopping-cart"></i>
        </div>
        <div class="stat-number">${orders.length}</div>
        <div class="stat-label">Total Orders</div>
        <div class="stat-change ${orders.length > 0 ? 'positive' : ''}">
            <i class="fas fa-arrow-${orders.length > 0 ? 'up' : 'right'}"></i>
            <span>${orders.length > 0 ? '8.5%' : '0%'} from last period</span>
        </div>
    </div>
    
    <div class="metric-card">
        <div class="metric-icon">
            <i class="fas fa-users"></i>
        </div>
        <div class="stat-number">${users.length}</div>
        <div class="stat-label">Total Customers</div>
        <div class="stat-change ${users.length > 0 ? 'positive' : ''}">
            <i class="fas fa-arrow-${users.length > 0 ? 'up' : 'right'}"></i>
            <span>${users.length > 0 ? '12.3%' : '0%'} from last period</span>
        </div>
    </div>
    
    <div class="metric-card">
        <div class="metric-icon">
            <i class="fas fa-box"></i>
        </div>
        <div class="stat-number">${products.length}</div>
        <div class="stat-label">Total Products</div>
        <div class="stat-change ${products.length > 0 ? 'positive' : ''}">
            <i class="fas fa-arrow-${products.length > 0 ? 'up' : 'right'}"></i>
            <span>${products.length > 0 ? '5.1%' : '0%'} from last period</span>
        </div>
    </div>
    
    <div class="metric-card">
        <div class="metric-icon">
            <i class="fas fa-star"></i>
        </div>
        <div class="stat-number">${reviews.length}</div>
        <div class="stat-label">Total Reviews</div>
        <div class="stat-change ${reviews.length > 0 ? 'positive' : ''}">
            <i class="fas fa-arrow-${reviews.length > 0 ? 'up' : 'right'}"></i>
            <span>${reviews.length > 0 ? '22.7%' : '0%'} from last period</span>
        </div>
    </div>
    
    <div class="metric-card">
        <div class="metric-icon">
            <i class="fas fa-envelope"></i>
        </div>
        <div class="stat-number">${contacts.length}</div>
        <div class="stat-label">Total Inquiries</div>
        <div class="stat-change ${contacts.length > 0 ? 'positive' : ''}">
            <i class="fas fa-arrow-${contacts.length > 0 ? 'up' : 'right'}"></i>
            <span>${contacts.length > 0 ? '18.4%' : '0%'} from last period</span>
        </div>
    </div>
</div>
    
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-chart-bar"></i> Revenue Overview</h2>
        </div>
        <div class="chart-container">
          <canvas id="revenueChart"></canvas>
        </div>
      </div>
      
      <div class="analytics-card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-chart-pie"></i> Orders by Status</h2>
        </div>
        <div class="chart-container">
          <canvas id="statusChart"></canvas>
        </div>
        <div class="status-indicators">
          <div class="status-indicator">
            <div class="status-color" style="background: #4facfe;"></div>
            <span>Processing (${statusCounts.processing})</span>
          </div>
          <div class="status-indicator">
            <div class="status-color" style="background: #43e97b;"></div>
            <span>Completed (${statusCounts.completed})</span>
          </div>
          <div class="status-indicator">
            <div class="status-color" style="background: #ffc107;"></div>
            <span>Pending (${statusCounts.pending})</span>
          </div>
          <div class="status-indicator">
            <div class="status-color" style="background: #dc3545;"></div>
            <span>Cancelled (${statusCounts.cancelled})</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="analytics-card" style="margin-top: 30px;">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-crown"></i> Top Selling Products</h2>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Sales</th>
              <th>Revenue</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            ${topProducts.slice(0, 5).map(product => `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${product.image ? `
                  <img src="${product.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
                  ` : `
                  <div style="width: 40px; height: 40px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-box" style="color: #6c757d;"></i>
                  </div>
                  `}
                  <div>
                    <div style="font-weight: 600;">${product.name}</div>
                    <small style="color: #6c757d;">SKU: ${product.slug}</small>
                  </div>
                </div>
              </td>
              <td>${product.category || 'General'}</td>
              <td>
                <div>${product.salesCount || 0} sold</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min((product.salesCount || 0) * 10, 100)}%; background: #e53935;"></div>
                </div>
              </td>
              <td style="font-weight: 600;">₹${product.revenue || 0}</td>
              <td>
                <span style="color: ${(product.stock || 0) > 10 ? '#28a745' : (product.stock || 0) > 0 ? '#ffc107' : '#dc3545'}; font-weight: 600;">
                  ${product.stock || 0}
                </span>
              </td>
            </tr>
            `).join('')}
            
            ${topProducts.length === 0 ? `
            <tr>
              <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-chart-bar" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                <h3>No Sales Data</h3>
                <p>No products have been sold yet.</p>
              </td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="analytics-card" style="margin-top: 30px;">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-clock"></i> Recent Orders</h2>
        <a href="/admin/orders" style="color: #e53935; text-decoration: none; font-weight: 600;">View All</a>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders.slice(-5).reverse().map(order => `
            <tr>
              <td>#${order.id || 'N/A'}</td>
              <td>${order.customerName || 'Guest'}</td>
              <td>${order.date || new Date().toLocaleDateString()}</td>
              <td style="font-weight: 600; color: #e53935;">₹${order.total || 0}</td>
              <td>
                <span style="padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; 
                      background: ${order.orderStatus === 'completed' ? '#d4edda' : 
                                  order.orderStatus === 'processing' ? '#cce5ff' : 
                                  order.orderStatus === 'pending' ? '#fff3cd' : '#f8d7da'}; 
                      color: ${order.orderStatus === 'completed' ? '#155724' : 
                              order.orderStatus === 'processing' ? '#004085' : 
                              order.orderStatus === 'pending' ? '#856404' : '#721c24'};">
                  ${order.orderStatus || 'pending'}
                </span>
              </td>
            </tr>
            `).join('')}
            
            ${orders.length === 0 ? `
            <tr>
              <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-shopping-cart" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                <h3>No Orders Yet</h3>
                <p>Your store hasn't received any orders yet.</p>
              </td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
    
   <!-- Performance Metrics -->
<div class="analytics-grid" style="margin-top: 30px;">
    <div class="analytics-card">
        <div class="card-header">
            <h2 class="card-title"><i class="fas fa-tachometer-alt"></i> Performance Metrics</h2>
        </div>
        <div style="padding: 20px 0;">
            <div style="margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Conversion Rate</span>
                    <span style="font-weight: 600;">${orders.length > 0 && users.length > 0 ? ((orders.length / users.length) * 100).toFixed(1) : '0'}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${orders.length > 0 && users.length > 0 ? Math.min((orders.length / users.length) * 100, 100) : 0}%; background: #4facfe;"></div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Average Order Value</span>
                    <span style="font-weight: 600;">₹${orders.length > 0 ? averageOrderValue.toFixed(2) : '0'}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${orders.length > 0 ? Math.min(averageOrderValue / 1000 * 100, 100) : 0}%; background: #43e97b;"></div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Customer Satisfaction</span>
                    <span style="font-weight: 600;">${reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0'}/5</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 20 : 0}%; background: #fee140;"></div>
                </div>
            </div>
            
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Inventory Turnover</span>
                    <span style="font-weight: 600;">${products.length > 0 && orders.length > 0 ? (orders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0) / products.length).toFixed(1) : '0'}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${products.length > 0 && orders.length > 0 ? Math.min((orders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0) / products.length) * 10, 100) : 0}%; background: #fa709a;"></div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="analytics-card">
        <div class="card-header">
            <h2 class="card-title"><i class="fas fa-user-plus"></i> User Growth</h2>
        </div>
        <div class="chart-container">
            <canvas id="userGrowthChart"></canvas>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <div style="font-size: 14px; color: #6c757d;">
                ${userGrowth.lastMonth || 0} new users this month
            </div>
            <div class="stat-change ${(userGrowth.change || 0) >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-arrow-${(userGrowth.change || 0) >= 0 ? 'up' : 'down'}"></i>
                <span>${Math.abs(userGrowth.change || 0)}% from last month</span>
            </div>
        </div>
    </div>
</div>
  
  ${getAdminFooter()}
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const revenueCtx = document.getElementById('revenueChart').getContext('2d');
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: ${JSON.stringify(monthlyData.months)},
          datasets: [{
            label: 'Revenue (₹)',
            data: ${JSON.stringify(monthlyData.revenues)},
            borderColor: '#e53935',
            backgroundColor: 'rgba(229, 57, 53, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      
      const statusCtx = document.getElementById('statusChart').getContext('2d');
      new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Processing', 'Completed', 'Pending', 'Cancelled'],
          datasets: [{
            data: [${statusCounts.processing}, ${statusCounts.completed}, ${statusCounts.pending}, ${statusCounts.cancelled}],
            backgroundColor: ['#4facfe', '#43e97b', '#ffc107', '#dc3545']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      
      const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
      new Chart(userGrowthCtx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(userGrowth.months)},
          datasets: [{
            label: 'New Users',
            data: ${JSON.stringify(userGrowth.counts)},
            backgroundColor: '#667eea',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    });
    
    function exportAnalytics() {
      alert('Exporting analytics data...');
    }
  </script>
</body>
</html>`);
});

function getMonthlyOrderData(orders) {
  const months = [];
  const revenues = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('default', { month: 'short' });
    months.push(monthName);
    
    const monthOrders = orders.filter(order => {
      if (!order.date) return false;
      const orderDate = new Date(order.date);
      return orderDate.getMonth() === date.getMonth() && 
             orderDate.getFullYear() === date.getFullYear();
    });
    
    const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    revenues.push(monthRevenue);
  }
  
  return { months, revenues };
}

function getTopProducts(orders, products) {
  const productSales = {};
  
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (!productSales[item.slug]) {
        productSales[item.slug] = {
          salesCount: 0,
          revenue: 0
        };
      }
      productSales[item.slug].salesCount += (item.quantity || 1);
      productSales[item.slug].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  
  return products
    .map(product => ({
      ...product,
      salesCount: productSales[product.slug]?.salesCount || 0,
      revenue: productSales[product.slug]?.revenue || 0
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 10);
}

function getUserGrowth(users) {
  const months = [];
  const counts = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('default', { month: 'short' });
    months.push(monthName);
    
    const monthUsers = users.filter(user => {
      if (!user.createdAt) return false;
      try {
        const userDate = new Date(user.createdAt);
        return userDate.getMonth() === date.getMonth() && 
               userDate.getFullYear() === date.getFullYear();
      } catch {
        return false;
      }
    });
    
    counts.push(monthUsers.length);
  }
  
  const lastMonth = counts[counts.length - 1] || 0;
  const previousMonth = counts[counts.length - 2] || 0;
  const change = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth * 100).toFixed(1) : 100;
  
  return { months, counts, lastMonth, change };
}

// ADMIN SETTINGS PAGE
app.get("/admin/settings", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  let settings = {};
  try {
    if (fs.existsSync('settings.json')) {
      settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
    }
  } catch (e) {
    settings = getDefaultSettings();
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Settings | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .settings-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .settings-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      background: white;
      padding: 15px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow-x: auto;
    }
    
    .settings-tab {
      padding: 12px 25px;
      border: 2px solid #e1e5e9;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.3s;
    }
    
    .settings-tab.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    .settings-content {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    
    .form-label.required::after {
      content: " *";
      color: #e53935;
    }
    
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
      font-family: inherit;
    }
    
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .form-textarea {
      min-height: 120px;
      resize: vertical;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #eee;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-primary:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #e53935;
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    .color-picker {
      display: flex;
      gap: 15px;
      align-items: center;
    }
    
    .color-preview {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 2px solid #ddd;
    }
    
    .file-upload {
      position: relative;
      overflow: hidden;
      display: inline-block;
      width: 100%;
    }
    
    .file-upload-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      border: 2px dashed #ced4da;
      border-radius: 10px;
      background: #f8f9fa;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .file-upload-label:hover {
      border-color: #e53935;
      background: #f0f0f0;
    }
    
    .file-upload-label i {
      font-size: 48px;
      color: #6c757d;
      margin-bottom: 15px;
    }
    
    .image-preview {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    
    .preview-image {
      width: 150px;
      height: 150px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #ddd;
    }
    
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-top: 30px;
    }
    
    .setting-card {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 10px;
      border-left: 4px solid #e53935;
    }
    
    .danger-zone {
      background: #f8d7da;
      border-color: #dc3545;
      padding: 30px;
      border-radius: 10px;
      margin-top: 40px;
    }
    
    .danger-zone h3 {
      color: #721c24;
      margin-top: 0;
    }
    
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .settings-tabs {
        flex-wrap: wrap;
      }
      
      .form-actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="settings-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-cog"></i> Settings
        </h1>
        <p style="color: #666; margin-top: 5px;">Manage your store configuration</p>
      </div>
    </div>
    
    <div class="settings-tabs">
      <button class="settings-tab active" onclick="showTab('general')">
        <i class="fas fa-store"></i> General
      </button>
      <button class="settings-tab" onclick="showTab('payment')">
        <i class="fas fa-credit-card"></i> Payment
      </button>
      <button class="settings-tab" onclick="showTab('shipping')">
        <i class="fas fa-truck"></i> Shipping
      </button>
      <button class="settings-tab" onclick="showTab('email')">
        <i class="fas fa-envelope"></i> Email
      </button>
      <button class="settings-tab" onclick="showTab('appearance')">
        <i class="fas fa-paint-brush"></i> Appearance
      </button>
      <button class="settings-tab" onclick="showTab('security')">
        <i class="fas fa-shield-alt"></i> Security
      </button>
    </div>
    
    <form method="POST" action="/admin/save-settings" enctype="multipart/form-data" id="settingsForm">
      <div class="settings-content">
        <div id="general" class="tab-content active">
          <h2 style="margin-top: 0; margin-bottom: 30px;">General Settings</h2>
          
          <div class="form-group">
            <label class="form-label required">Store Name</label>
            <input type="text" name="storeName" class="form-input" 
                   value="${settings.storeName || 'Sports India'}" 
                   placeholder="Enter store name" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Store Email</label>
              <input type="email" name="storeEmail" class="form-input" 
                     value="${settings.storeEmail || 'info@sportsindia.com'}" 
                     placeholder="Enter store email" required>
            </div>
            
            <div class="form-group">
              <label class="form-label required">Store Phone</label>
              <input type="tel" name="storePhone" class="form-input" 
                     value="${settings.storePhone || '+91 9813639843'}" 
                     placeholder="Enter store phone" required>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Store Address</label>
            <textarea name="storeAddress" class="form-textarea" 
                      placeholder="Enter store address">${settings.storeAddress || '123 Sports Complex, Connaught Place, New Delhi'}</textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Store Logo</label>
            <div class="file-upload">
              <div class="file-upload-label" onclick="document.getElementById('logoInput').click()">
                <i class="fas fa-cloud-upload-alt"></i>
                <span style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">
                  Click to upload logo
                </span>
                <span style="color: #666; text-align: center;">
                  Recommended: 200×60px (PNG, JPG, SVG)<br>
                  Max file size: 2MB
                </span>
              </div>
              <input type="file" name="logo" id="logoInput" accept="image/*">
            </div>
            
            ${settings.storeLogo ? `
            <div class="image-preview">
              <img src="${settings.storeLogo}" class="preview-image">
              <input type="hidden" name="existingLogo" value="${settings.storeLogo}">
            </div>
            ` : ''}
          </div>
          
          <div class="form-group">
            <label class="form-label">Currency</label>
            <select name="currency" class="form-select">
              <option value="INR" ${(settings.currency || 'INR') === 'INR' ? 'selected' : ''}>Indian Rupee (₹)</option>
              <option value="USD" ${(settings.currency || 'INR') === 'USD' ? 'selected' : ''}>US Dollar ($)</option>
              <option value="EUR" ${(settings.currency || 'INR') === 'EUR' ? 'selected' : ''}>Euro (€)</option>
              <option value="GBP" ${(settings.currency || 'INR') === 'GBP' ? 'selected' : ''}>British Pound (£)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Timezone</label>
            <select name="timezone" class="form-select">
              <option value="Asia/Kolkata" ${(settings.timezone || 'Asia/Kolkata') === 'Asia/Kolkata' ? 'selected' : ''}>Indian Standard Time (IST)</option>
              <option value="UTC" ${(settings.timezone || 'Asia/Kolkata') === 'UTC' ? 'selected' : ''}>UTC</option>
              <option value="America/New_York" ${(settings.timezone || 'Asia/Kolkata') === 'America/New_York' ? 'selected' : ''}>Eastern Time (ET)</option>
              <option value="Europe/London" ${(settings.timezone || 'Asia/Kolkata') === 'Europe/London' ? 'selected' : ''}>London Time (GMT)</option>
            </select>
          </div>
        </div>
        
        <div id="payment" class="tab-content">
          <h2 style="margin-top: 0; margin-bottom: 30px;">Payment Settings</h2>
          
          <div class="form-group">
            <label class="form-label">Payment Methods</label>
            <div class="settings-grid">
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="codEnabled" ${settings.codEnabled !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Cash on Delivery</div>
                    <small style="color: #666;">Allow customers to pay on delivery</small>
                  </div>
                </div>
              </div>
              
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="cardEnabled" ${settings.cardEnabled !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Credit/Debit Cards</div>
                    <small style="color: #666;">Accept Visa, Mastercard, RuPay</small>
                  </div>
                </div>
              </div>
              
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="upiEnabled" ${settings.upiEnabled !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">UPI Payments</div>
                    <small style="color: #666;">Google Pay, PhonePe, Paytm</small>
                  </div>
                </div>
              </div>
              
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="netbankingEnabled" ${settings.netbankingEnabled !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Net Banking</div>
                    <small style="color: #666;">All Indian banks</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Razorpay Key ID</label>
              <input type="text" name="razorpayKey" class="form-input" 
                     value="${settings.razorpayKey || ''}" 
                     placeholder="Enter Razorpay Key ID">
            </div>
            
            <div class="form-group">
              <label class="form-label">Razorpay Secret</label>
              <input type="password" name="razorpaySecret" class="form-input" 
                     value="${settings.razorpaySecret || ''}" 
                     placeholder="Enter Razorpay Secret">
            </div>
          </div>
          
          <div class="form-group">
            <div class="toggle-switch">
              <label class="switch">
                <input type="checkbox" name="testMode" ${settings.testMode === true ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <span>Enable Test Mode (Sandbox)</span>
            </div>
          </div>
        </div>
        
        <div id="shipping" class="tab-content">
          <h2 style="margin-top: 0; margin-bottom: 30px;">Shipping Settings</h2>
          
          <div class="form-group">
            <label class="form-label">Shipping Charges</label>
            <div class="form-row">
              <div class="form-group">
                <input type="number" name="shippingCharge" class="form-input" 
                       value="${settings.shippingCharge || '49'}" 
                       placeholder="Standard shipping charge" min="0">
                <small style="color: #666; display: block; margin-top: 5px;">Standard shipping charge (₹)</small>
              </div>
              
              <div class="form-group">
                <input type="number" name="freeShippingThreshold" class="form-input" 
                       value="${settings.freeShippingThreshold || '999'}" 
                       placeholder="Free shipping threshold" min="0">
                <small style="color: #666; display: block; margin-top: 5px;">Free shipping above (₹)</small>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Shipping Zones</label>
            <div class="setting-card">
              <div style="margin-bottom: 15px;">
                <div style="font-weight: 600;">India</div>
                <small style="color: #666;">All states and union territories</small>
              </div>
              <div class="toggle-switch">
                <label class="switch">
                  <input type="checkbox" name="shippingIndia" ${settings.shippingIndia !== false ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
                <span>Enable shipping across India</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Delivery Time</label>
            <div class="form-row">
              <div class="form-group">
                <input type="number" name="deliveryTimeMin" class="form-input" 
                       value="${settings.deliveryTimeMin || '5'}" 
                       placeholder="Minimum days" min="1">
                <small style="color: #666; display: block; margin-top: 5px;">Minimum delivery days</small>
              </div>
              
              <div class="form-group">
                <input type="number" name="deliveryTimeMax" class="form-input" 
                       value="${settings.deliveryTimeMax || '7'}" 
                       placeholder="Maximum days" min="1">
                <small style="color: #666; display: block; margin-top: 5px;">Maximum delivery days</small>
              </div>
            </div>
          </div>
        </div>
        
        <div id="email" class="tab-content">
          <h2 style="margin-top: 0; margin-bottom: 30px;">Email Settings</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">SMTP Host</label>
              <input type="text" name="smtpHost" class="form-input" 
                     value="${settings.smtpHost || 'smtp.gmail.com'}" 
                     placeholder="Enter SMTP host">
            </div>
            
            <div class="form-group">
              <label class="form-label">SMTP Port</label>
              <input type="number" name="smtpPort" class="form-input" 
                     value="${settings.smtpPort || '587'}" 
                     placeholder="Enter SMTP port">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">SMTP Username</label>
              <input type="text" name="smtpUser" class="form-input" 
                     value="${settings.smtpUser || ''}" 
                     placeholder="Enter SMTP username">
            </div>
            
            <div class="form-group">
              <label class="form-label">SMTP Password</label>
              <input type="password" name="smtpPass" class="form-input" 
                     value="${settings.smtpPass || ''}" 
                     placeholder="Enter SMTP password">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Email Templates</label>
            <div class="settings-grid">
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="emailOrderConfirm" ${settings.emailOrderConfirm !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Order Confirmation</div>
                    <small style="color: #666;">Send when order is placed</small>
                  </div>
                </div>
              </div>
              
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="emailShipping" ${settings.emailShipping !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Shipping Updates</div>
                    <small style="color: #666;">Send shipping notifications</small>
                  </div>
                </div>
              </div>
              
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="emailNewsletter" ${settings.emailNewsletter !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Newsletters</div>
                    <small style="color: #666;">Send promotional emails</small>
                  </div>
                </div>
              </div>
              
              <div class="setting-card">
                <div class="toggle-switch">
                  <label class="switch">
                    <input type="checkbox" name="emailReviews" ${settings.emailReviews !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <div>
                    <div style="font-weight: 600;">Review Requests</div>
                    <small style="color: #666;">Ask for product reviews</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div id="appearance" class="tab-content">
          <h2 style="margin-top: 0; margin-bottom: 30px;">Appearance Settings</h2>
          
          <div class="form-group">
            <label class="form-label">Theme Color</label>
            <div class="color-picker">
              <input type="color" name="themeColor" id="themeColor" 
                     value="${settings.themeColor || '#e53935'}" 
                     style="width: 60px; height: 60px; border: none; border-radius: 8px; cursor: pointer;">
              <div>
                <div style="font-weight: 600;">Primary Color</div>
                <small style="color: #666;">Click to choose a color</small>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Favicon</label>
            <div class="file-upload">
              <div class="file-upload-label" onclick="document.getElementById('faviconInput').click()">
                <i class="fas fa-cloud-upload-alt"></i>
                <span style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">
                  Click to upload favicon
                </span>
                <span style="color: #666; text-align: center;">
                  Recommended: 32×32px (ICO, PNG)<br>
                  Max file size: 100KB
                </span>
              </div>
              <input type="file" name="favicon" id="faviconInput" accept="image/*">
            </div>
            
            ${settings.favicon ? `
            <div class="image-preview">
              <img src="${settings.favicon}" class="preview-image" style="width: 50px; height: 50px;">
              <input type="hidden" name="existingFavicon" value="${settings.favicon}">
            </div>
            ` : ''}
          </div>
          
          <div class="form-group">
            <label class="form-label">Homepage Layout</label>
            <select name="homepageLayout" class="form-select">
              <option value="default" ${(settings.homepageLayout || 'default') === 'default' ? 'selected' : ''}>Default Layout</option>
              <option value="minimal" ${(settings.homepageLayout || 'default') === 'minimal' ? 'selected' : ''}>Minimal Layout</option>
              <option value="grid" ${(settings.homepageLayout || 'default') === 'grid' ? 'selected' : ''}>Grid Layout</option>
              <option value="fullwidth" ${(settings.homepageLayout || 'default') === 'fullwidth' ? 'selected' : ''}>Full Width Layout</option>
            </select>
          </div>
          
          <div class="form-group">
            <div class="toggle-switch">
              <label class="switch">
                <input type="checkbox" name="darkMode" ${settings.darkMode === true ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <span>Enable Dark Mode</span>
            </div>
          </div>
          
          <div class="form-group">
            <div class="toggle-switch">
              <label class="switch">
                <input type="checkbox" name="showBanner" ${settings.showBanner !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <span>Show Announcement Banner</span>
            </div>
          </div>
          
          ${settings.showBanner !== false ? `
          <div class="form-group">
            <label class="form-label">Banner Text</label>
            <input type="text" name="bannerText" class="form-input" 
                   value="${settings.bannerText || '🎉 Free Shipping on Orders Above ₹999!'}" 
                   placeholder="Enter banner text">
          </div>
          ` : ''}
        </div>
        
        <div id="security" class="tab-content">
          <h2 style="margin-top: 0; margin-bottom: 30px;">Security Settings</h2>
          
          <div class="form-group">
            <label class="form-label">Admin Session Timeout (minutes)</label>
            <input type="number" name="sessionTimeout" class="form-input" 
                   value="${settings.sessionTimeout || '30'}" 
                   placeholder="Session timeout in minutes" min="5">
          </div>
          
          <div class="form-group">
            <label class="form-label">Max Login Attempts</label>
            <input type="number" name="maxLoginAttempts" class="form-input" 
                   value="${settings.maxLoginAttempts || '5'}" 
                   placeholder="Maximum login attempts" min="1">
          </div>
          
          <div class="form-group">
            <label class="form-label">Password Policy</label>
            <div class="setting-card">
              <div class="toggle-switch">
                <label class="switch">
                  <input type="checkbox" name="requireStrongPassword" ${settings.requireStrongPassword === true ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 600;">Require Strong Passwords</div>
                  <small style="color: #666;">Minimum 8 characters with letters and numbers</small>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Two-Factor Authentication</label>
            <div class="setting-card">
              <div class="toggle-switch">
                <label class="switch">
                  <input type="checkbox" name="twoFactorAuth" ${settings.twoFactorAuth === true ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 600;">Enable 2FA for Admin</div>
                  <small style="color: #666;">Add extra security for admin login</small>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">IP Whitelist</label>
            <textarea name="ipWhitelist" class="form-textarea" 
                      placeholder="Enter allowed IP addresses (one per line)">${settings.ipWhitelist || ''}</textarea>
            <small style="color: #666; display: block; margin-top: 5px;">Leave empty to allow all IPs</small>
          </div>
          
          <div class="danger-zone">
            <h3><i class="fas fa-exclamation-triangle"></i> Danger Zone</h3>
            <p>These actions are irreversible. Please proceed with caution.</p>
            
            <div style="margin-top: 20px;">
              <button type="button" onclick="clearCache()" class="btn btn-outline" style="margin-right: 15px;">
                <i class="fas fa-broom"></i> Clear Cache
              </button>
              
              <button type="button" onclick="resetSettings()" class="btn btn-outline" style="margin-right: 15px;">
                <i class="fas fa-undo"></i> Reset to Defaults
              </button>
              
              <button type="button" onclick="backupDatabase()" class="btn btn-outline">
                <i class="fas fa-database"></i> Backup Database
              </button>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Save Settings
          </button>
          <button type="button" onclick="testSettings()" class="btn btn-outline">
            <i class="fas fa-vial"></i> Test Settings
          </button>
        </div>
      </div>
    </form>
  </div>
  
  ${getAdminFooter()}
  
  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
      });
      
      document.getElementById(tabId).style.display = 'block';
      
      document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      event.currentTarget.classList.add('active');
      
      localStorage.setItem('activeSettingsTab', tabId);
    }
    
    function testSettings() {
      alert('Testing settings... This would test email, payment, etc. in a real application.');
    }
    
    function clearCache() {
      if (confirm('Are you sure you want to clear all cache? This will not affect your data.')) {
        alert('Cache cleared successfully!');
      }
    }
    
    function resetSettings() {
      if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
        window.location.href = '/admin/reset-settings';
      }
    }
    
    function backupDatabase() {
      alert('Database backup initiated. This would download a backup file in a real application.');
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      const activeTab = localStorage.getItem('activeSettingsTab') || 'general';
      showTab(activeTab);
      
      document.querySelectorAll('.settings-tab').forEach(tab => {
        if (tab.textContent.includes(activeTab.charAt(0).toUpperCase() + activeTab.slice(1))) {
          tab.classList.add('active');
        }
      });
    });
    
    document.getElementById('settingsForm').addEventListener('submit', function(e) {
      return true;
    });
  </script>
</body>
</html>`);
});
// MANAGE SECTIONS PAGE (ADMIN)
app.get("/admin/manage-sections", (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect("/login");
    }
    
    const products = loadPosts();
    
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Manage Sections | Sports India Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        /* Your existing styles */
    </style>
</head>
<body>
    ${getAdminHeader(req)}
    
    <div class="sections-container">
        <h1>Manage Homepage Sections</h1>
        
        <!-- Featured Products Section -->
        <div class="section-card">
            <div class="section-header">
                <h2>⭐ Featured Products</h2>
                <span>Currently showing ${products.filter(p => p.featured).length} products</span>
            </div>
            <p>Select products to show in the Featured Products section</p>
            
            <div class="product-list" id="featuredList">
                ${products.map((product, index) => `
                <div class="product-item">
                    <div class="product-info">
                        ${product.images && product.images[0] ? 
                            `<img src="${product.images[0]}" class="product-image">` : 
                            `<div style="width:60px;height:60px;background:#f0f0f0;border-radius:8px;"></div>`
                        }
                        <div>
                            <div style="font-weight:600;">${product.name}</div>
                            <div style="color:#666; font-size:14px;">${product.category}</div>
                        </div>
                    </div>
                    <div class="toggle-switch">
                        <label class="switch">
                            <input type="checkbox" class="featured-toggle" data-index="${index}" ${product.featured ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span>${product.featured ? 'Yes' : 'No'}</span>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <!-- New Arrivals Section -->
        <div class="section-card">
            <div class="section-header">
                <h2>✨ New Arrivals</h2>
                <span>Currently showing ${products.filter(p => p.showInNewArrivals).length} products</span>
            </div>
            <p>Select products to show in the New Arrivals section</p>
            
            <div class="product-list" id="newArrivalsList">
                ${products.map((product, index) => `
                <div class="product-item">
                    <div class="product-info">
                        ${product.images && product.images[0] ? 
                            `<img src="${product.images[0]}" class="product-image">` : 
                            `<div style="width:60px;height:60px;background:#f0f0f0;border-radius:8px;"></div>`
                        }
                        <div>
                            <div style="font-weight:600;">${product.name}</div>
                            <div style="color:#666; font-size:14px;">Added: ${new Date(product.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="toggle-switch">
                        <label class="switch">
                            <input type="checkbox" class="newarrival-toggle" data-index="${index}" ${product.showInNewArrivals ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span>${product.showInNewArrivals ? 'Yes' : 'No'}</span>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Best Sellers Section -->
        <div class="section-card">
            <div class="section-header">
                <h2>🏆 Best Sellers</h2>
                <span>Currently showing ${products.filter(p => p.showInBestSellers).length} products</span>
            </div>
            <p>Select products to show in the Best Sellers section</p>
            
            <div class="product-list" id="bestSellersList">
                ${products.map((product, index) => `
                <div class="product-item">
                    <div class="product-info">
                        ${product.images && product.images[0] ? 
                            `<img src="${product.images[0]}" class="product-image">` : 
                            `<div style="width:60px;height:60px;background:#f0f0f0;border-radius:8px;"></div>`
                        }
                        <div>
                            <div style="font-weight:600;">${product.name}</div>
                            <div style="color:#666; font-size:14px;">${product.category}</div>
                        </div>
                    </div>
                    <div class="toggle-switch">
                        <label class="switch">
                            <input type="checkbox" class="bestseller-toggle" data-index="${index}" ${product.showInBestSellers ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span>${product.showInBestSellers ? 'Yes' : 'No'}</span>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <button class="save-btn" onclick="saveAllSections()">Save All Changes</button>
    </div>
    
    <script>
        function saveAllSections() {
            const featured = [];
            const newArrivals = [];
            const bestSellers = [];
            
            document.querySelectorAll('.featured-toggle:checked').forEach(cb => {
                featured.push(parseInt(cb.dataset.index));
            });
            
            document.querySelectorAll('.newarrival-toggle:checked').forEach(cb => {
                newArrivals.push(parseInt(cb.dataset.index));
            });
            
            document.querySelectorAll('.bestseller-toggle:checked').forEach(cb => {
                bestSellers.push(parseInt(cb.dataset.index));
            });
            
            fetch('/admin/update-sections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ featured, newArrivals, bestSellers })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Sections updated successfully!');
                } else {
                    alert('Error updating sections');
                }
            });
        }
    </script>
    
    ${getAdminFooter()}
</body>
</html>`);
});

// UPDATE SECTIONS API
app.post("/admin/update-sections", (req, res) => {
    if (!req.session.loggedIn) {
        return res.status(401).json({ error: "Not authorized" });
    }
    
    const { featured, newArrivals, bestSellers } = req.body;
    const products = loadPosts();
    
    products.forEach((p, index) => {
        p.featured = featured.includes(index);
        p.showInNewArrivals = newArrivals.includes(index);
        p.showInBestSellers = bestSellers.includes(index);
    });
    
    fs.writeFileSync(POSTS_FILE, JSON.stringify(products, null, 2));
    
    res.json({ success: true });
});

// ADMIN CATEGORIES PAGE
app.get("/admin/categories", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const categories = loadCategories();
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Manage Categories | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .categories-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .category-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .category-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .subcategory-list {
      padding: 20px;
    }
    
    .subcategory-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .subcategory-item:last-child {
      border-bottom: none;
    }
    
    .add-subcategory {
      padding: 20px;
      background: #f8f9fa;
      border-top: 1px solid #eee;
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    .form-input {
      padding: 8px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="categories-container">
    <div class="page-header">
      <h1><i class="fas fa-tags"></i> Manage Categories</h1>
      <button class="btn btn-primary" onclick="showAddCategoryModal()">
        <i class="fas fa-plus"></i> Add Category
      </button>
    </div>
    
    <div class="categories-grid">
      ${categories.map(cat => `
      <div class="category-card">
        <div class="category-header">
          <h3 style="margin: 0;">${cat.name}</h3>
          <div>
            <button class="btn btn-outline btn-sm" onclick="editCategory(${cat.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCategory(${cat.id})">Delete</button>
          </div>
        </div>
        
        <div class="subcategory-list">
          <h4 style="margin-top: 0;">Subcategories</h4>
          ${cat.subcategories.map(sub => `
          <div class="subcategory-item">
            <span>${sub.name}</span>
            <div>
              <button class="btn btn-outline btn-sm" onclick="editSubcategory(${sub.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteSubcategory(${cat.id}, ${sub.id})">Delete</button>
            </div>
          </div>
          `).join('')}
        </div>
        
        <div class="add-subcategory">
          <input type="text" id="newSubcat-${cat.id}" class="form-input" placeholder="New subcategory name" style="width: calc(100% - 80px); display: inline-block; margin-right: 5px;">
          <button class="btn btn-primary btn-sm" onclick="addSubcategory(${cat.id})">Add</button>
        </div>
      </div>
      `).join('')}
    </div>
  </div>
  
  <div id="addCategoryModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
    <div style="background: white; padding: 40px; border-radius: 15px; max-width: 500px; width: 90%;">
      <h2 style="margin-top: 0;">Add New Category</h2>
      <input type="text" id="newCategoryName" class="form-input" placeholder="Category Name" style="width: 100%; margin-bottom: 20px;">
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewCategory()">Save</button>
      </div>
    </div>
  </div>
  
  <script>
    function addSubcategory(categoryId) {
      const input = document.getElementById('newSubcat-' + categoryId);
      const subcatName = input.value.trim();
      
      if (!subcatName) {
        alert('Please enter a subcategory name');
        return;
      }
      
      fetch('/admin/add-subcategory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId, subcategoryName: subcatName })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          location.reload();
        } else {
          alert('Error adding subcategory');
        }
      });
    }
    
    function deleteSubcategory(categoryId, subcategoryId) {
      if (confirm('Are you sure you want to delete this subcategory?')) {
        fetch('/admin/delete-subcategory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categoryId, subcategoryId })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          }
        });
      }
    }
    
    function showAddCategoryModal() {
      document.getElementById('addCategoryModal').style.display = 'flex';
    }
    
    function closeModal() {
      document.getElementById('addCategoryModal').style.display = 'none';
    }
    
    function saveNewCategory() {
      const categoryName = document.getElementById('newCategoryName').value.trim();
      if (!categoryName) {
        alert('Please enter a category name');
        return;
      }
      
      fetch('/admin/add-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          location.reload();
        } else {
          alert('Error adding category');
        }
      });
    }
    
    function deleteCategory(categoryId) {
      if (confirm('Are you sure you want to delete this category? All subcategories will also be deleted.')) {
        fetch('/admin/delete-category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categoryId })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          }
        });
      }
    }
    
    function editCategory(categoryId) {
      const newName = prompt('Enter new category name:');
      if (newName) {
        fetch('/admin/update-category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categoryId, name: newName })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          }
        });
      }
    }
    
    function editSubcategory(subcategoryId) {
      const newName = prompt('Enter new subcategory name:');
      if (newName) {
        fetch('/admin/update-subcategory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subcategoryId, name: newName })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          }
        });
      }
    }
  </script>
</body>
</html>`);
});

// CATEGORY MANAGEMENT API ENDPOINTS
app.post("/admin/add-subcategory", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { categoryId, subcategoryName } = req.body;
  const categories = loadCategories();
  
  const category = categories.find(c => c.id == categoryId);
  if (category) {
    const newSubcat = {
      id: Date.now(),
      name: subcategoryName,
      slug: slugify(subcategoryName)
    };
    category.subcategories.push(newSubcat);
    saveCategories(categories);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

app.post("/admin/delete-subcategory", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { categoryId, subcategoryId } = req.body;
  const categories = loadCategories();
  
  const category = categories.find(c => c.id == categoryId);
  if (category) {
    category.subcategories = category.subcategories.filter(s => s.id != subcategoryId);
    saveCategories(categories);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

app.post("/admin/add-category", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { name } = req.body;
  const categories = loadCategories();
  
  const newCategory = {
    id: Date.now(),
    name: name,
    slug: slugify(name),
    subcategories: []
  };
  
  categories.push(newCategory);
  saveCategories(categories);
  res.json({ success: true });
});

app.post("/admin/delete-category", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { categoryId } = req.body;
  const categories = loadCategories();
  
  const newCategories = categories.filter(c => c.id != categoryId);
  saveCategories(newCategories);
  res.json({ success: true });
});

app.post("/admin/update-category", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { categoryId, name } = req.body;
  const categories = loadCategories();
  
  const category = categories.find(c => c.id == categoryId);
  if (category) {
    category.name = name;
    category.slug = slugify(name);
    saveCategories(categories);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

app.post("/admin/update-subcategory", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { subcategoryId, name } = req.body;
  const categories = loadCategories();
  
  for (let category of categories) {
    const subcat = category.subcategories.find(s => s.id == subcategoryId);
    if (subcat) {
      subcat.name = name;
      subcat.slug = slugify(name);
      saveCategories(categories);
      return res.json({ success: true });
    }
  }
  
  res.status(404).json({ error: "Subcategory not found" });
});

// SAVE SETTINGS (ADMIN)
app.post("/admin/save-settings", upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 }
]), (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  let settings = {};
  try {
    if (fs.existsSync('settings.json')) {
      settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
    }
  } catch (e) {
    settings = getDefaultSettings();
  }
  
  const formData = req.body;
  
  if (req.files && req.files.logo) {
    settings.storeLogo = "/uploads/" + req.files.logo[0].filename;
  } else if (formData.existingLogo) {
    settings.storeLogo = formData.existingLogo;
  }
  
  if (req.files && req.files.favicon) {
    settings.favicon = "/uploads/" + req.files.favicon[0].filename;
  } else if (formData.existingFavicon) {
    settings.favicon = formData.existingFavicon;
  }
  
  settings.storeName = formData.storeName;
  settings.storeEmail = formData.storeEmail;
  settings.storePhone = formData.storePhone;
  settings.storeAddress = formData.storeAddress;
  settings.currency = formData.currency;
  settings.timezone = formData.timezone;
  
  settings.codEnabled = formData.codEnabled === 'on';
  settings.cardEnabled = formData.cardEnabled === 'on';
  settings.upiEnabled = formData.upiEnabled === 'on';
  settings.netbankingEnabled = formData.netbankingEnabled === 'on';
  settings.razorpayKey = formData.razorpayKey;
  settings.razorpaySecret = formData.razorpaySecret;
  settings.testMode = formData.testMode === 'on';
  
  settings.shippingCharge = parseInt(formData.shippingCharge) || 49;
  settings.freeShippingThreshold = parseInt(formData.freeShippingThreshold) || 999;
  settings.shippingIndia = formData.shippingIndia === 'on';
  settings.deliveryTimeMin = parseInt(formData.deliveryTimeMin) || 5;
  settings.deliveryTimeMax = parseInt(formData.deliveryTimeMax) || 7;
  
  settings.smtpHost = formData.smtpHost;
  settings.smtpPort = parseInt(formData.smtpPort) || 587;
  settings.smtpUser = formData.smtpUser;
  settings.smtpPass = formData.smtpPass;
  settings.emailOrderConfirm = formData.emailOrderConfirm === 'on';
  settings.emailShipping = formData.emailShipping === 'on';
  settings.emailNewsletter = formData.emailNewsletter === 'on';
  settings.emailReviews = formData.emailReviews === 'on';
  
  settings.themeColor = formData.themeColor;
  settings.homepageLayout = formData.homepageLayout;
  settings.darkMode = formData.darkMode === 'on';
  settings.showBanner = formData.showBanner === 'on';
  settings.bannerText = formData.bannerText;
  
  settings.sessionTimeout = parseInt(formData.sessionTimeout) || 30;
  settings.maxLoginAttempts = parseInt(formData.maxLoginAttempts) || 5;
  settings.requireStrongPassword = formData.requireStrongPassword === 'on';
  settings.twoFactorAuth = formData.twoFactorAuth === 'on';
  settings.ipWhitelist = formData.ipWhitelist;
  
  settings.updatedAt = new Date().toISOString();
  
  fs.writeFileSync('settings.json', JSON.stringify(settings, null, 2));
  
  res.redirect("/admin/settings?success=Settings saved successfully");
});

// RESET SETTINGS (ADMIN)
app.get("/admin/reset-settings", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const defaultSettings = getDefaultSettings();
  fs.writeFileSync('settings.json', JSON.stringify(defaultSettings, null, 2));
  
  res.redirect("/admin/settings?success=Settings reset to defaults");
});

function getDefaultSettings() {
  return {
    storeName: "Sports India",
    storeEmail: "info@sportsindia.com",
    storePhone: "+91 9813639843",
    storeAddress: "123 Sports Complex, Connaught Place, New Delhi",
    storeLogo: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    
    codEnabled: true,
    cardEnabled: true,
    upiEnabled: true,
    netbankingEnabled: true,
    razorpayKey: "",
    razorpaySecret: "",
    testMode: false,
    
    shippingCharge: 49,
    freeShippingThreshold: 999,
    shippingIndia: true,
    deliveryTimeMin: 5,
    deliveryTimeMax: 7,
    
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    emailOrderConfirm: true,
    emailShipping: true,
    emailNewsletter: true,
    emailReviews: true,
    
    themeColor: "#e53935",
    favicon: "",
    homepageLayout: "default",
    darkMode: false,
    showBanner: true,
    bannerText: "🎉 Free Shipping on Orders Above ₹999!",
    
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    requireStrongPassword: false,
    twoFactorAuth: false,
    ipWhitelist: "",
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ADMIN CUSTOMERS PAGE
app.get("/admin/customers", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const users = loadUsers();
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  
  const customers = users.map(user => {
    const userOrders = orders.filter(order => order.userId === user.id);
    const totalSpent = userOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const lastOrder = userOrders.length > 0 
      ? userOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;
    
    return {
      ...user,
      orderCount: userOrders.length,
      totalSpent,
      lastOrderDate: lastOrder ? lastOrder.date : 'Never',
      status: user.active !== false ? 'active' : 'inactive'
    };
  });
  
  const statusFilter = req.query.status;
  const searchQuery = (req.query.search || '').toLowerCase();
  
  let filteredCustomers = customers;
  
  if (statusFilter && statusFilter !== 'all') {
    filteredCustomers = filteredCustomers.filter(c => c.status === statusFilter);
  }
  
  if (searchQuery) {
    filteredCustomers = filteredCustomers.filter(c =>
      (c.name || '').toLowerCase().includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(searchQuery) ||
      (c.phone || '').toLowerCase().includes(searchQuery)
    );
  }
  
  const sortBy = req.query.sort || 'newest';
  filteredCustomers.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'orders':
        return b.orderCount - a.orderCount;
      case 'spent':
        return b.totalSpent - a.totalSpent;
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'newest':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Customers | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .customers-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .search-filters {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      flex-wrap: wrap;
    }
    
    .search-input {
      flex: 1;
      min-width: 300px;
      padding: 12px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
    }
    
    .filter-select {
      padding: 12px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      background: white;
    }
    
    .search-btn {
      background: #e53935;
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
      text-align: center;
    }
    
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 5px;
      color: #111;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .customers-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .customers-table th {
      background: #f8f9fa;
      padding: 20px;
      text-align: left;
      font-weight: 600;
      color: #212529;
      border-bottom: 2px solid #dee2e6;
    }
    
    .customers-table td {
      padding: 20px;
      border-bottom: 1px solid #dee2e6;
      vertical-align: middle;
    }
    
    .customers-table tr:hover {
      background: #f8f9fa;
    }
    
    .customer-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
    }
    
    .status-badge {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-active {
      background: #d4edda;
      color: #155724;
    }
    
    .status-inactive {
      background: #f8d7da;
      color: #721c24;
    }
    
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    
    .btn {
      padding: 8px 15px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 13px;
    }
    
    .customer-details-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal-content {
      background: white;
      border-radius: 15px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 40px;
    }
    
    .page-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-weight: 600;
    }
    
    .page-btn.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    .export-buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    @media (max-width: 992px) {
      .customers-table {
        display: block;
        overflow-x: auto;
      }
      
      .search-filters {
        flex-direction: column;
      }
      
      .search-input {
        min-width: auto;
      }
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .stats-cards {
        grid-template-columns: 1fr;
      }
      
      .action-buttons {
        flex-direction: column;
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="customers-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-users"></i> Customers
        </h1>
        <p style="color: #666; margin-top: 5px;">Total: ${users.length} customers</p>
      </div>
      
      <div>
        <button onclick="exportCustomers('csv')" class="btn btn-outline" style="margin-right: 10px;">
          <i class="fas fa-file-csv"></i> Export CSV
        </button>
        <button onclick="exportCustomers('pdf')" class="btn btn-outline">
          <i class="fas fa-file-pdf"></i> Export PDF
        </button>
      </div>
    </div>
    
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">${users.length}</div>
        <div class="stat-label">Total Customers</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">${customers.filter(c => c.orderCount > 0).length}</div>
        <div class="stat-label">Active Buyers</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">₹${customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">${customers.filter(c => c.status === 'active').length}</div>
        <div class="stat-label">Active Accounts</div>
      </div>
    </div>
    
    <form method="GET" action="/admin/customers" class="search-filters">
      <input type="text" name="search" class="search-input" 
             placeholder="Search by name, email, or phone..." 
             value="${req.query.search || ''}">
      
      <select name="status" class="filter-select" onchange="this.form.submit()">
        <option value="all" ${!statusFilter || statusFilter === 'all' ? 'selected' : ''}>All Status</option>
        <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
        <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive Only</option>
      </select>
      
      <select name="sort" class="filter-select" onchange="this.form.submit()">
        <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
        <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
        <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Name A-Z</option>
        <option value="orders" ${sortBy === 'orders' ? 'selected' : ''}>Most Orders</option>
        <option value="spent" ${sortBy === 'spent' ? 'selected' : ''}>Highest Spent</option>
      </select>
      
      <button type="submit" class="search-btn">
        <i class="fas fa-search"></i> Search
      </button>
      
      <button type="button" onclick="this.form.reset(); this.form.submit();" class="btn btn-outline">
        <i class="fas fa-redo"></i> Reset
      </button>
    </form>
    
    ${filteredCustomers.length === 0 ? `
    <div class="empty-state">
      <div style="font-size: 80px; margin-bottom: 30px; color: #ddd;">
        <i class="fas fa-users"></i>
      </div>
      <h2 style="margin-bottom: 20px;">No customers found</h2>
      <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
        ${searchQuery || statusFilter ? 'Try changing your search or filter criteria.' : 'No customers have registered yet.'}
      </p>
    </div>
    ` : `
    <table class="customers-table">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Contact</th>
          <th>Orders</th>
          <th>Total Spent</th>
          <th>Last Order</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filteredCustomers.map(customer => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="customer-avatar">
                ${customer.name ? customer.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style="font-weight: 600;">${customer.name || 'Unnamed Customer'}</div>
                <small style="color: #6c757d;">ID: ${customer.id}</small>
              </div>
            </div>
          </td>
          
          <td>
            <div style="margin-bottom: 5px;">${customer.email || 'No email'}</div>
            ${customer.phone ? `<div style="color: #666;">${customer.phone}</div>` : ''}
          </td>
          
          <td>
            <div style="font-weight: 600; font-size: 18px;">${customer.orderCount}</div>
            <small style="color: #666;">orders</small>
          </td>
          
          <td>
            <div style="font-weight: 600; color: #e53935; font-size: 18px;">
              ₹${customer.totalSpent.toLocaleString()}
            </div>
          </td>
          
          <td>
            <div style="font-weight: 600;">${customer.lastOrderDate}</div>
          </td>
          
          <td>
            <span class="status-badge ${customer.status === 'active' ? 'status-active' : 'status-inactive'}">
              ${customer.status}
            </span>
          </td>
          
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-primary" onclick="viewCustomer(${customer.id})">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline" onclick="editCustomer(${customer.id})">
                <i class="fas fa-edit"></i>
              </button>
              ${customer.id !== req.session.userId ? `
              <button class="btn btn-sm btn-outline" onclick="toggleCustomerStatus(${customer.id}, '${customer.status}')">
                <i class="fas fa-user-${customer.status === 'active' ? 'slash' : 'check'}"></i>
              </button>
              ` : ''}
            </div>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    ${filteredCustomers.length > 10 ? `
    <div class="pagination">
      <button class="page-btn">←</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn">→</button>
    </div>
    ` : ''}
    `}
  </div>
  
  <div id="customerModal" class="customer-details-modal">
    <div class="modal-content">
      <div style="padding: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <h2 style="margin: 0; font-size: 24px;">Customer Details</h2>
          <button onclick="closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <div id="customerDetails"></div>
      </div>
    </div>
  </div>
  
  ${getAdminFooter()}
  
  <script>
    function viewCustomer(customerId) {
      fetch('/admin/customer-details/' + customerId)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            const modal = document.getElementById('customerModal');
            const details = document.getElementById('customerDetails');
            
            details.innerHTML = \`
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                  <div style="margin-bottom: 25px;">
                    <div style="font-weight: 600; color: #666; margin-bottom: 8px;">Personal Information</div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">
                          \${data.customer.name ? data.customer.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style="font-size: 20px; font-weight: 600;">\${data.customer.name || 'Unnamed Customer'}</div>
                          <div style="color: #666;">Customer ID: \${data.customer.id}</div>
                        </div>
                      </div>
                      
                      <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #666;">Email:</span>
                          <span style="font-weight: 600;">\${data.customer.email || 'N/A'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #666;">Phone:</span>
                          <span style="font-weight: 600;">\${data.customer.phone || 'N/A'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #666;">Joined:</span>
                          <span style="font-weight: 600;">\${new Date(data.customer.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #666;">Status:</span>
                          <span style="padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: \${data.customer.status === 'active' ? '#d4edda' : '#f8d7da'}; color: \${data.customer.status === 'active' ? '#155724' : '#721c24'};">\${data.customer.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div style="font-weight: 600; color: #666; margin-bottom: 8px;">Shipping Address</div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; min-height: 120px;">
                      \${data.customer.address ? \`
                      <div>\${data.customer.address.street || ''}</div>
                      <div>\${data.customer.address.city || ''}, \${data.customer.address.state || ''}</div>
                      <div>PIN: \${data.customer.address.pincode || ''}</div>
                      <div>\${data.customer.address.country || ''}</div>
                      \` : 'No address saved'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div style="margin-bottom: 25px;">
                    <div style="font-weight: 600; color: #666; margin-bottom: 8px;">Order Statistics</div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div style="text-align: center;">
                          <div style="font-size: 28px; font-weight: 700; color: #e53935;">\${data.customer.orderCount}</div>
                          <div style="color: #666; font-size: 14px;">Total Orders</div>
                        </div>
                        <div style="text-align: center;">
                          <div style="font-size: 28px; font-weight: 700; color: #28a745;">₹\${data.customer.totalSpent.toLocaleString()}</div>
                          <div style="color: #666; font-size: 14px;">Total Spent</div>
                        </div>
                      </div>
                      
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #666;">Average Order:</span>
                        <span style="font-weight: 600;">₹\${data.customer.orderCount > 0 ? (data.customer.totalSpent / data.customer.orderCount).toFixed(2) : '0'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #666;">Last Order:</span>
                        <span style="font-weight: 600;">\${data.customer.lastOrderDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div style="font-weight: 600; color: #666; margin-bottom: 8px;">Recent Orders</div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; max-height: 200px; overflow-y: auto;">
                      \${data.recentOrders && data.recentOrders.length > 0 ? 
                        data.recentOrders.map(order => \`
                        <div style="padding: 10px 0; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
                          <div>
                            <div style="font-weight: 600;">Order #\${order.id}</div>
                            <div style="color: #666; font-size: 12px;">\${order.date}</div>
                          </div>
                          <div style="font-weight: 600; color: #e53935;">₹\${order.total}</div>
                        </div>
                        \`).join('') : 
                        '<div style="text-align: center; color: #666; padding: 20px;">No recent orders</div>'
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              <div style="display: flex; gap: 15px; margin-top: 30px;">
                <button onclick="editCustomer(\${data.customer.id})" class="btn btn-primary">
                  <i class="fas fa-edit"></i> Edit Customer
                </button>
                <button onclick="sendEmailToCustomer(\${data.customer.id})" class="btn btn-outline">
                  <i class="fas fa-envelope"></i> Send Email
                </button>
                <button onclick="viewOrders(\${data.customer.id})" class="btn btn-outline">
                  <i class="fas fa-shopping-cart"></i> View All Orders
                </button>
              </div>
            \`;
            
            modal.style.display = 'flex';
          } else {
            alert('Error loading customer details');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Network error - please try again');
        });
    }
    
    function closeModal() {
      document.getElementById('customerModal').style.display = 'none';
    }
    
    function editCustomer(customerId) {
      window.location.href = '/admin/edit-customer/' + customerId;
    }
    
    function toggleCustomerStatus(customerId, currentStatus) {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      if (confirm(\`Are you sure you want to \${currentStatus === 'active' ? 'deactivate' : 'activate'} this customer?\`)) {
        fetch('/admin/toggle-customer-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            customerId: customerId,
            status: newStatus
          })
        })
        .then(response => {
          if (response.ok) {
            location.reload();
          } else {
            alert('Error updating customer status');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Network error - please try again');
        });
      }
    }
    
    function exportCustomers(format) {
      alert(\`Exporting customers data as \${format.toUpperCase()}...\`);
    }
    
    function sendEmailToCustomer(customerId) {
      const subject = prompt('Enter email subject:');
      if (subject) {
        const message = prompt('Enter email message:');
        if (message) {
          alert('Email sent successfully!');
        }
      }
    }
    
    function viewOrders(customerId) {
      window.location.href = '/admin/orders?customer=' + customerId;
    }
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
    
    document.getElementById('customerModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
  </script>
</body>
</html>`);
});

// CUSTOMER DETAILS API
app.get("/admin/customer-details/:id", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const users = loadUsers();
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  
  const customerId = parseInt(req.params.id);
  const customer = users.find(u => u.id === customerId);
  
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }
  
  const userOrders = orders.filter(order => order.userId === customerId);
  const totalSpent = userOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lastOrder = userOrders.length > 0 
    ? userOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;
  
  const customerData = {
    ...customer,
    orderCount: userOrders.length,
    totalSpent,
    lastOrderDate: lastOrder ? lastOrder.date : 'Never',
    status: customer.active !== false ? 'active' : 'inactive'
  };
  
  const recentOrders = userOrders.slice(-5).reverse();
  
  res.json({
    success: true,
    customer: customerData,
    recentOrders: recentOrders.map(order => ({
      id: order.id,
      date: order.date,
      total: order.total,
      status: order.orderStatus
    }))
  });
});

// TOGGLE CUSTOMER STATUS
app.post("/admin/toggle-customer-status", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { customerId, status } = req.body;
  const users = loadUsers();
  
  const customerIndex = users.findIndex(u => u.id === parseInt(customerId));
  
  if (customerIndex === -1) {
    return res.status(404).json({ error: "Customer not found" });
  }
  
  if (parseInt(customerId) === req.session.userId) {
    return res.status(400).json({ error: "Cannot change your own status" });
  }
  
  users[customerIndex].active = status === 'active';
  users[customerIndex].updatedAt = new Date().toISOString();
  
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  res.json({ success: true });
});

// EDIT CUSTOMER PAGE
app.get("/admin/edit-customer/:id", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const users = loadUsers();
  const customerId = parseInt(req.params.id);
  const customer = users.find(u => u.id === customerId);
  
  if (!customer) {
    return res.redirect("/admin/customers?error=Customer not found");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Edit Customer | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .edit-customer-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .form-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #eee;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-primary:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #e53935;
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .form-actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  ${getAdminHeader(req)}
  
  <div class="edit-customer-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-user-edit"></i> Edit Customer
        </h1>
        <p style="color: #666; margin-top: 5px;">Customer ID: ${customer.id}</p>
      </div>
      
      <div>
        <a href="/admin/customers" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back to Customers
        </a>
      </div>
    </div>
    
    <div class="form-card">
      <form method="POST" action="/admin/update-customer/${customer.id}" id="editCustomerForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input type="text" name="firstName" class="form-input" 
                   value="${customer.name ? customer.name.split(' ')[0] : ''}" 
                   placeholder="Enter first name">
          </div>
          
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input type="text" name="lastName" class="form-input" 
                   value="${customer.name ? customer.name.split(' ').slice(1).join(' ') : ''}" 
                   placeholder="Enter last name">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" name="email" class="form-input" 
                 value="${customer.email || ''}" 
                 placeholder="Enter email address" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" name="phone" class="form-input" 
                 value="${customer.phone || ''}" 
                 placeholder="Enter phone number">
        </div>
        
        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" name="addressStreet" class="form-input" 
                 value="${customer.address ? customer.address.street : ''}" 
                 placeholder="Street address">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <input type="text" name="addressCity" class="form-input" 
                   value="${customer.address ? customer.address.city : ''}" 
                   placeholder="City">
          </div>
          
          <div class="form-group">
            <input type="text" name="addressState" class="form-input" 
                   value="${customer.address ? customer.address.state : ''}" 
                   placeholder="State">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <input type="text" name="addressPincode" class="form-input" 
                   value="${customer.address ? customer.address.pincode : ''}" 
                   placeholder="PIN Code">
          </div>
          
          <div class="form-group">
            <input type="text" name="addressCountry" class="form-input" 
                   value="${customer.address ? customer.address.country : 'India'}" 
                   placeholder="Country">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Account Status</label>
          <div class="toggle-switch">
            <label class="switch">
              <input type="checkbox" name="active" ${customer.active !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Active account</span>
          </div>
        </div>
        
        ${customer.id !== req.session.userId ? `
        <div class="form-group">
          <label class="form-label">User Role</label>
          <select name="role" class="form-input">
            <option value="user" ${customer.role === 'user' || !customer.role ? 'selected' : ''}>Regular User</option>
            <option value="admin" ${customer.role === 'admin' ? 'selected' : ''}>Administrator</option>
            <option value="editor" ${customer.role === 'editor' ? 'selected' : ''}>Content Editor</option>
          </select>
        </div>
        ` : ''}
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Update Customer
          </button>
          <a href="/admin/customers" class="btn btn-secondary">
            <i class="fas fa-times"></i> Cancel
          </a>
        </div>
      </form>
    </div>
  </div>
  
  ${getAdminFooter()}
  
  <script>
    document.getElementById('editCustomerForm').addEventListener('submit', function(e) {
      const email = document.querySelector('input[name="email"]').value;
      if (!email.includes('@')) {
        e.preventDefault();
        alert('Please enter a valid email address');
        return false;
      }
      return true;
    });
  </script>
</body>
</html>`);
});

// UPDATE CUSTOMER
app.post("/admin/update-customer/:id", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const users = loadUsers();
  const customerId = parseInt(req.params.id);
  const customerIndex = users.findIndex(u => u.id === customerId);
  
  if (customerIndex === -1) {
    return res.redirect("/admin/customers?error=Customer not found");
  }
  
  if (customerId === req.session.userId && req.session.role !== 'admin') {
    return res.redirect("/admin/customers?error=Cannot edit your own account");
  }
  
  users[customerIndex].name = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim();
  users[customerIndex].email = req.body.email;
  users[customerIndex].phone = req.body.phone;
  
  users[customerIndex].address = {
    street: req.body.addressStreet || '',
    city: req.body.addressCity || '',
    state: req.body.addressState || '',
    pincode: req.body.addressPincode || '',
    country: req.body.addressCountry || 'India'
  };
  
  users[customerIndex].active = req.body.active === 'on';
  users[customerIndex].role = req.body.role || 'user';
  users[customerIndex].updatedAt = new Date().toISOString();
  
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  res.redirect("/admin/customers?success=Customer updated successfully");
});

// PRODUCT REVIEWS & RATINGS
app.get("/product/:slug/reviews", (req, res) => {
  const products = loadPosts();
  const product = products.find(p => p.slug === req.params.slug);
  
  if (!product) return res.redirect("/");
  
  const reviews = loadReviews().filter(r => r.productSlug === req.params.slug);
  
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Reviews - ${product.name} | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .reviews-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .product-header {
      display: flex;
      align-items: center;
      gap: 30px;
      margin-bottom: 50px;
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .product-image {
      width: 150px;
      height: 150px;
      object-fit: cover;
      border-radius: 10px;
    }
    
    .rating-summary {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 40px;
    }
    
    .overall-rating {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .rating-number {
      font-size: 64px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 10px;
    }
    
    .rating-stars {
      font-size: 28px;
      color: #ffc107;
      margin-bottom: 10px;
    }
    
    .rating-breakdown {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .rating-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      margin-top: 5px;
      overflow: hidden;
    }
    
    .rating-fill {
      height: 100%;
      background: #ffc107;
    }
    
    .reviews-list {
      margin-bottom: 50px;
    }
    
    .review-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      margin-bottom: 20px;
    }
    
    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .reviewer-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .reviewer-avatar {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
    }
    
    .review-date {
      color: #666;
      font-size: 14px;
    }
    
    .review-rating {
      color: #ffc107;
      font-size: 20px;
    }
    
    .review-images {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    
    .review-img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
      cursor: pointer;
    }
    
    .review-form-container {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .star-rating {
      display: flex;
      flex-direction: row-reverse;
      justify-content: flex-end;
      gap: 5px;
      margin-bottom: 20px;
    }
    
    .star-rating input {
      display: none;
    }
    
    .star-rating label {
      font-size: 30px;
      color: #ddd;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    .star-rating input:checked ~ label,
    .star-rating label:hover,
    .star-rating label:hover ~ label {
      color: #ffc107;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .form-input, .form-textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
    }
    
    .form-textarea {
      min-height: 150px;
      resize: vertical;
    }
    
    .submit-btn {
      background: #e53935;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .submit-btn:hover {
      background: #c62828;
    }
    
    .verified-badge {
      display: inline-block;
      background: #d4edda;
      color: #155724;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    
    .helpful-buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    
    .helpful-btn {
      background: #f8f9fa;
      border: 1px solid #ddd;
      padding: 5px 15px;
      border-radius: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    @media (max-width: 768px) {
      .product-header {
        flex-direction: column;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="reviews-container">
    <a href="/product/${product.slug}" style="display: inline-flex; align-items: center; gap: 8px; color: #e53935; text-decoration: none; margin-bottom: 30px;">
      ← Back to Product
    </a>

    <div class="product-header">
      ${product.images && product.images[0] ? `<img src="${product.images[0]}" class="product-image">` : ''}
      <div>
        <h1 style="margin-top: 0;">${product.name}</h1>
        <div style="font-size: 24px; color: #e53935; font-weight: bold;">₹ ${product.price}</div>
        <p>${product.category} • ${product.stock || 0} in stock</p>
      </div>
    </div>

    <div class="rating-summary">
      <div class="overall-rating">
        <div class="rating-number">${averageRating}</div>
        <div class="rating-stars">${getStarRating(averageRating)}</div>
        <div>Based on ${reviews.length} reviews</div>
      </div>

      <div class="rating-breakdown">
        ${[5, 4, 3, 2, 1].map(star => {
          const count = reviews.filter(r => r.rating === star).length;
          const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
          return `
          <div>
            <div style="display: flex; justify-content: space-between;">
              <span>${star} ★</span>
              <span>${count} (${percentage.toFixed(0)}%)</span>
            </div>
            <div class="rating-bar">
              <div class="rating-fill" style="width: ${percentage}%"></div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="reviews-list">
      <h2 style="margin-bottom: 30px;">Customer Reviews (${reviews.length})</h2>
      
      ${reviews.length === 0 ? `
      <div style="text-align: center; padding: 50px; background: #f8f9fa; border-radius: 10px;">
        <div style="font-size: 48px; margin-bottom: 20px;">😊</div>
        <h3>No reviews yet</h3>
        <p>Be the first to review this product!</p>
      </div>
      ` : reviews.map(review => `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">${review.name ? review.name.charAt(0).toUpperCase() : 'U'}</div>
            <div>
              <div style="font-weight: 600;">${review.name || 'Anonymous'}</div>
              ${review.verifiedPurchase ? '<span class="verified-badge">✓ Verified Purchase</span>' : ''}
              <div class="review-date">${review.date || new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        </div>
        
        <h4 style="margin-top: 0; margin-bottom: 10px;">${review.title || ''}</h4>
        <p>${review.comment || ''}</p>
        
        ${review.images && review.images.length > 0 ? `
        <div class="review-images">
          ${review.images.map(img => `<img src="${img}" class="review-img" onclick="openImageModal('${img}')">`).join('')}
        </div>
        ` : ''}
        
        ${review.size ? `<div style="margin-top: 15px; color: #666;">Size Purchased: <strong>${review.size}</strong></div>` : ''}
        
        <div class="helpful-buttons">
          <button class="helpful-btn" onclick="markHelpful(${review.id})">👍 Helpful (${review.helpful || 0})</button>
          <button class="helpful-btn" onclick="markNotHelpful(${review.id})">👎 Not Helpful (${review.notHelpful || 0})</button>
          <button class="helpful-btn" onclick="reportReview(${review.id})">⚠️ Report</button>
        </div>
      </div>
      `).join('')}
    </div>

    ${req.session.userId ? `
    <div class="review-form-container">
      <h2 style="margin-top: 0;">Write a Review</h2>
      <form id="reviewForm" method="POST" action="/submit-review/${product.slug}" enctype="multipart/form-data">
        <div class="form-group">
          <div class="form-label">Your Rating *</div>
          <div class="star-rating">
            <input type="radio" id="star5" name="rating" value="5" required><label for="star5">★</label>
            <input type="radio" id="star4" name="rating" value="4"><label for="star4">★</label>
            <input type="radio" id="star3" name="rating" value="3"><label for="star3">★</label>
            <input type="radio" id="star2" name="rating" value="2"><label for="star2">★</label>
            <input type="radio" id="star1" name="rating" value="1"><label for="star1">★</label>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Review Title</label>
          <input type="text" name="title" class="form-input" placeholder="Summarize your experience">
        </div>
        
        <div class="form-group">
          <label class="form-label">Your Review *</label>
          <textarea name="comment" class="form-textarea" placeholder="Share your experience with this product..." required></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Size Purchased (optional)</label>
          <select name="size" class="form-input">
            <option value="">Select size</option>
            ${(product.sizes || []).map(size => `<option value="${size}">${size}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Upload Photos (optional)</label>
          <input type="file" name="reviewImages" multiple accept="image/*">
          <small>Upload up to 5 photos of your product</small>
        </div>
        
        <button type="submit" class="submit-btn">Submit Review</button>
      </form>
    </div>
    ` : `
    <div style="text-align: center; padding: 40px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      <h3>Want to leave a review?</h3>
      <p>Please <a href="/login-user" style="color: #e53935;">login</a> to share your experience with this product.</p>
    </div>
    `}
  </div>

  <div id="imageModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center;">
    <div style="position: relative; max-width: 90%; max-height: 90%;">
      <img id="modalImage" src="" style="max-width: 100%; max-height: 90vh; border-radius: 10px;">
      <button onclick="closeImageModal()" style="position: absolute; top: -40px; right: -40px; background: none; border: none; color: white; font-size: 30px; cursor: pointer;">×</button>
    </div>
  </div>

  ${getFooter()}
  
  <script>
    function openImageModal(src) {
      document.getElementById('modalImage').src = src;
      document.getElementById('imageModal').style.display = 'flex';
    }
    
    function closeImageModal() {
      document.getElementById('imageModal').style.display = 'none';
    }
    
    function markHelpful(reviewId) {
      alert('Thanks for your feedback!');
    }
    
    function markNotHelpful(reviewId) {
      alert('Thanks for your feedback!');
    }
    
    function reportReview(reviewId) {
      const reason = prompt('Please specify the reason for reporting:');
      if (reason) {
        alert('Thank you for reporting. Our team will review this.');
      }
    }
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeImageModal();
    });
    
    document.getElementById('imageModal').addEventListener('click', function(e) {
      if (e.target === this) closeImageModal();
    });
  </script>
</body>
</html>`);
});

app.post("/submit-review/:slug", upload.array("reviewImages", 5), (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/product/${req.params.slug}/reviews`);
  }
  
  const reviews = loadReviews();
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);
  
  const existingReview = reviews.find(r => 
    r.userId === req.session.userId && r.productSlug === req.params.slug
  );
  
  if (existingReview) {
    return res.redirect(`/product/${req.params.slug}/reviews?error=You have already reviewed this product`);
  }
  
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const hasPurchased = orders.some(order => 
    order.userId === req.session.userId &&
    order.items.some(item => item.slug === req.params.slug)
  );
  
  const newReview = {
    id: Date.now(),
    productSlug: req.params.slug,
    userId: req.session.userId,
    name: user?.name || 'Anonymous',
    rating: parseInt(req.body.rating),
    title: req.body.title,
    comment: req.body.comment,
    size: req.body.size,
    verifiedPurchase: hasPurchased,
    date: new Date().toLocaleString(),
    helpful: 0,
    notHelpful: 0,
    images: req.files ? req.files.map(f => "/uploads/" + f.filename) : []
  };
  
  reviews.push(newReview);
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
  
  res.redirect(`/product/${req.params.slug}/reviews?success=Review submitted successfully`);
});

// CART PAGE
app.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Shopping Cart | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .cart-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .cart-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .cart-content {
      display: flex;
      gap: 30px;
    }
    
    .cart-items {
      flex: 2;
    }
    
    .cart-summary {
      flex: 1;
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      height: fit-content;
    }
    
    .cart-item {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      display: flex;
      gap: 20px;
      align-items: center;
    }
    
    .item-image {
      width: 150px;
      height: 150px;
      object-fit: cover;
      border-radius: 10px;
    }
    
    .item-details {
      flex: 1;
    }
    
    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 15px;
    }
    
    .quantity-btn {
      width: 35px;
      height: 35px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
    }
    
    .empty-cart {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .checkout-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 15px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    
    .remove-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="cart-container">
    <div class="cart-header">
      <h1 style="font-size: 42px; margin-bottom: 10px;">🛒 Shopping Cart</h1>
      <p style="font-size: 18px; color: #666;">${cart.length} items in your cart</p>
    </div>
    
    ${cart.length === 0 ? `
    <div class="empty-cart">
      <div style="font-size: 80px; margin-bottom: 30px;">🛒</div>
      <h2 style="margin-bottom: 20px;">Your cart is empty</h2>
      <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
        Looks like you haven't added any products to your cart yet. Start shopping to find amazing sports gear!
      </p>
      <a href="/" style="display: inline-block; background: #e53935; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Start Shopping
      </a>
    </div>
    ` : `
    <div class="cart-content">
      <div class="cart-items">
${cart.map((item, index) => {
  // Ensure item has valid data with fallbacks
  const itemName = item.name || 'Product';
  const itemPrice = parseFloat(item.price) || 0;
  const itemQuantity = parseInt(item.quantity) || 1;
  const itemImage = item.image || null;
  const subtotal = itemPrice * itemQuantity;
  
  return `
<div class="cart-item">
  ${itemImage ? `<img src="${itemImage}" class="item-image" onerror="this.src=''; this.parentElement.innerHTML='<div style=\\'width:150px; height:150px; background:#f0f0f0; border-radius:10px; display:flex; align-items:center; justify-content:center;\\'><div style=\\'text-align:center;\\'><div style=\\'font-size:48px;\\'>🏏</div><small>No Image</small></div></div>';">` : `
  <div style="width: 150px; height: 150px; background: #f0f0f0; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
    <div style="text-align: center;">
      <div style="font-size: 48px;">🏏</div>
      <small>No Image</small>
    </div>
  </div>
  `}
  
  <div class="item-details">
    <h3 style="margin-top: 0; margin-bottom: 10px;">${itemName}</h3>
    ${item.brand ? `<div style="color: #666; font-size: 14px; margin-bottom: 5px;">Brand: ${item.brand}</div>` : ''}
    ${item.category ? `<div style="color: #666; font-size: 14px; margin-bottom: 5px;">Category: ${item.category}</div>` : ''}
    ${item.size ? `<div style="color: #666; font-size: 14px; margin-bottom: 5px;">Size: ${item.size}</div>` : ''}
    ${item.color ? `<div style="color: #666; font-size: 14px; margin-bottom: 5px;">Color: ${item.color}</div>` : ''}
    
    <div style="font-size: 20px; color: #e53935; font-weight: bold; margin: 10px 0;">₹ ${itemPrice.toFixed(2)}</div>
    
    <div class="quantity-controls">
      <button class="quantity-btn" onclick="updateQuantity(${index}, ${itemQuantity - 1})">-</button>
      <span style="font-size: 18px; font-weight: 600; padding: 0 15px;">${itemQuantity}</span>
      <button class="quantity-btn" onclick="updateQuantity(${index}, ${itemQuantity + 1})">+</button>
      
      <button class="remove-btn" onclick="removeFromCart(${index})" style="margin-left: 20px;">
        Remove
      </button>
    </div>
    
    <div style="margin-top: 15px; font-size: 18px; font-weight: 600;">
      Subtotal: ₹ ${subtotal.toFixed(2)}
    </div>
  </div>
</div>
`;
}).join('')}
      </div>
      
      <div class="cart-summary">
        <h2 style="margin-top: 0; margin-bottom: 25px;">Order Summary</h2>
        
        <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Subtotal</span>
            <span>₹ ${total}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Shipping</span>
            <span>₹ ${total > 999 ? '0' : '49'}</span>
          </div>
         <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Tax (GST)</span>
            <span>₹ ${(total * 0.18).toFixed(2)}</span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: bold; margin-bottom: 30px;">
          <span>Total</span>
          <span style="color: #e53935;">₹ ${(total + (total > 999 ? 0 : 49) + (total * 0.18)).toFixed(2)}</span>
        </div>
        
        <a href="/checkout" class="checkout-btn">Proceed to Checkout</a>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            <i class="fas fa-shield-alt"></i> Secure checkout • 30-day returns • Free shipping on orders above ₹999
          </p>
        </div>
      </div>
    </div>
    `}
  </div>
  
  ${getFooter()}
  
  <script>
    function updateQuantity(index, newQuantity) {
      if (newQuantity < 1) {
        removeFromCart(index);
        return;
      }
      
      fetch('/update-cart-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index: index,
          quantity: newQuantity
        })
      }).then(() => {
        location.reload();
      });
    }
    
    function removeFromCart(index) {
      if (confirm('Remove this item from cart?')) {
        fetch('/remove-from-cart/' + index, { method: 'POST' })
          .then(() => {
            location.reload();
          });
      }
    }
  </script>
</body>
</html>`);
});

// CHECKOUT PAGE
app.get("/checkout", (req, res) => {
  const cart = req.session.cart || [];
  
  if (cart.length === 0) {
    return res.redirect("/cart");
  }
  
// Calculate totals safely with fallbacks
const subtotal = cart.reduce((sum, item) => {
  const price = parseFloat(item.price) || 0;
  const quantity = parseInt(item.quantity) || 1;
  return sum + (price * quantity);
}, 0);

const shipping = subtotal > 999 ? 0 : 49;
const tax = subtotal * 0.18;
const total = subtotal + shipping + tax;

// Format for display
const formattedSubtotal = isNaN(subtotal) ? 0 : subtotal;
const formattedTax = isNaN(tax) ? 0 : tax;
const formattedTotal = isNaN(total) ? 0 : total;
// Format order ID - show last 8 digits only for readability
const formattedOrderId = order.id ? 
  '#' + order.id.toString().slice(-8) : 
  '#N/A';

// Full ID for reference (shown in tooltip)
const fullOrderId = order.id || 'N/A';
  
  let user = null;
  if (req.session.userId) {
    const users = loadUsers();
    user = users.find(u => u.id === req.session.userId);
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Checkout | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .checkout-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .checkout-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .checkout-steps {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin-bottom: 50px;
    }
    
    .checkout-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    
    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #ddd;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
    }
    
    .step-number.active {
      background: #e53935;
      color: white;
    }
    
    .step-label {
      font-size: 14px;
      color: #666;
    }
    
    .checkout-content {
      display: flex;
      gap: 40px;
    }
    
    .checkout-form {
      flex: 2;
    }
    
    .checkout-summary {
      flex: 1;
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      height: fit-content;
    }
    
    .form-section {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 20px;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input, .form-select {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .order-summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    
    .order-total {
      display: flex;
      justify-content: space-between;
      font-size: 24px;
      font-weight: bold;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #eee;
    }
    
    .place-order-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 20px;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 30px;
      transition: all 0.3s;
    }
    
    .place-order-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .payment-methods {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    
    .payment-method {
      border: 2px solid #ddd;
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .payment-method.selected {
      border-color: #e53935;
      background: rgba(229,57,53,0.1);
    }
    
    .payment-icon {
      font-size: 30px;
      margin-bottom: 10px;
    }
    
    .cart-item-summary {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    
    .item-image-small {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
    }
    
    .guest-checkout {
      text-align: center;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #eee;
    }
    
    .guest-checkout a {
      color: #e53935;
      font-weight: 600;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="checkout-container">
    <div class="checkout-header">
      <h1 style="font-size: 42px; margin-bottom: 10px;">Checkout</h1>
      <p style="font-size: 18px; color: #666;">Complete your purchase in 3 easy steps</p>
    </div>
    
    <div class="checkout-steps">
      <div class="checkout-step">
        <div class="step-number active">1</div>
        <div class="step-label">Shipping</div>
      </div>
      <div class="checkout-step">
        <div class="step-number">2</div>
        <div class="step-label">Payment</div>
      </div>
      <div class="checkout-step">
        <div class="step-number">3</div>
        <div class="step-label">Confirmation</div>
      </div>
    </div>
    
    <form method="POST" action="/place-order" id="checkoutForm">
      <div class="checkout-content">
        <div class="checkout-form">
          <div class="form-section">
            <h2 class="section-title"><i class="fas fa-truck"></i> Shipping Information</h2>
            
            ${!req.session.userId ? `
            <div class="guest-checkout">
              <p>Already have an account? <a href="/login-user">Login for faster checkout</a></p>
            </div>
            ` : ''}
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name *</label>
                <input type="text" name="firstName" class="form-input" value="${user ? user.name.split(' ')[0] : ''}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Last Name *</label>
                <input type="text" name="lastName" class="form-input" value="${user ? user.name.split(' ').slice(1).join(' ') : ''}" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input type="email" name="email" class="form-input" value="${user ? user.email : ''}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <input type="tel" name="phone" class="form-input" value="${user ? user.phone : ''}" required>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Address *</label>
              <input type="text" name="address" class="form-input" placeholder="Street address" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">City *</label>
                <input type="text" name="city" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">State *</label>
                <input type="text" name="state" class="form-input" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">PIN Code *</label>
                <input type="text" name="pincode" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Country</label>
                <input type="text" name="country" class="form-input" value="India" readonly>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h2 class="section-title"><i class="fas fa-credit-card"></i> Payment Method</h2>
            
            <div class="payment-methods">
              <div class="payment-method selected" onclick="selectPayment('cod')">
                <div class="payment-icon">💵</div>
                <div style="font-weight: 600;">Cash on Delivery</div>
                <small style="color: #666;">Pay when you receive</small>
                <input type="radio" name="paymentMethod" value="cod" checked style="display: none;">
              </div>
              
              <div class="payment-method" onclick="selectPayment('card')">
                <div class="payment-icon">💳</div>
                <div style="font-weight: 600;">Credit/Debit Card</div>
                <small style="color: #666;">Visa, Mastercard, RuPay</small>
                <input type="radio" name="paymentMethod" value="card" style="display: none;">
              </div>
              
              <div class="payment-method" onclick="selectPayment('upi')">
                <div class="payment-icon">📱</div>
                <div style="font-weight: 600;">UPI</div>
                <small style="color: #666;">Google Pay, PhonePe, Paytm</small>
                <input type="radio" name="paymentMethod" value="upi" style="display: none;">
              </div>
              
              <div class="payment-method" onclick="selectPayment('netbanking')">
                <div class="payment-icon">🏦</div>
                <div style="font-weight: 600;">Net Banking</div>
                <small style="color: #666;">All Indian banks</small>
                <input type="radio" name="paymentMethod" value="netbanking" style="display: none;">
              </div>
            </div>
            
            <div id="cardDetails" style="display: none; margin-top: 30px;">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Card Number</label>
                  <input type="text" name="cardNumber" class="form-input" placeholder="1234 5678 9012 3456">
                </div>
                
                <div class="form-group">
                  <label class="form-label">Card Holder Name</label>
                  <input type="text" name="cardName" class="form-input" placeholder="Name on card">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Expiry Date</label>
                  <input type="month" name="cardExpiry" class="form-input">
                </div>
                
                <div class="form-group">
                  <label class="form-label">CVV</label>
                  <input type="text" name="cardCVV" class="form-input" placeholder="123" maxlength="3">
                </div>
              </div>
            </div>
            
            <div id="upiDetails" style="display: none; margin-top: 30px;">
              <div class="form-group">
                <label class="form-label">UPI ID</label>
                <input type="text" name="upiId" class="form-input" placeholder="username@upi">
              </div>
            </div>
          </div>
        </div>
        
        <div class="checkout-summary">
          <h2 style="margin-top: 0; margin-bottom: 25px;">Order Summary</h2>
          
          <div style="margin-bottom: 25px;">
            ${cart.map(item => `
            <div class="cart-item-summary">
              <img src="${item.image || '/placeholder.jpg'}" class="item-image-small">
              <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 5px;">${item.name}</div>
                <div style="color: #666; font-size: 14px;">Qty: ${item.quantity} × ₹${item.price}</div>
              </div>
              <div style="font-weight: 600;">₹${item.price * item.quantity}</div>
            </div>
            `).join('')}
          </div>
          
          <div class="order-summary-item">
            <span>Subtotal</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          
          <div class="order-summary-item">
            <span>Shipping</span>
            <span>₹${shipping.toFixed(2)}</span>
          </div>
          
          <div class="order-summary-item">
            <span>Tax (GST 18%)</span>
            <span>₹${tax.toFixed(2)}</span>
          </div>
          
          <div class="order-total">
            <span>Total</span>
            <span style="color: #e53935;">₹${total.toFixed(2)}</span>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <i class="fas fa-shield-alt" style="color: #28a745;"></i>
              <span style="font-weight: 600;">Secure Checkout</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <i class="fas fa-undo" style="color: #17a2b8;"></i>
              <span>30-Day Return Policy</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-truck" style="color: #e53935;"></i>
              <span>Free shipping on orders above ₹999</span>
            </div>
          </div>
          
          <button type="submit" class="place-order-btn">
            <i class="fas fa-lock"></i> Place Order
          </button>
          
          <p style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
            By placing your order, you agree to our <a href="/terms" style="color: #e53935;">Terms & Conditions</a>
          </p>
        </div>
      </div>
    </form>
  </div>
  
  ${getFooter()}
  
  <script>
    function selectPayment(method) {
      document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
      
      document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.checked = radio.value === method;
      });
      
      document.getElementById('cardDetails').style.display = method === 'card' ? 'block' : 'none';
      document.getElementById('upiDetails').style.display = method === 'upi' ? 'block' : 'none';
    }
    
    document.getElementById('checkoutForm').addEventListener('submit', function(e) {
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
      
      if (paymentMethod === 'card') {
        const cardNumber = document.querySelector('input[name="cardNumber"]').value;
        const cardName = document.querySelector('input[name="cardName"]').value;
        const cardExpiry = document.querySelector('input[name="cardExpiry"]').value;
        const cardCVV = document.querySelector('input[name="cardCVV"]').value;
        
        if (!cardNumber || !cardName || !cardExpiry || !cardCVV) {
          e.preventDefault();
          alert('Please fill all card details');
          return false;
        }
      }
      
      if (paymentMethod === 'upi') {
        const upiId = document.querySelector('input[name="upiId"]').value;
        if (!upiId) {
          e.preventDefault();
          alert('Please enter your UPI ID');
          return false;
        }
      }
      
      return true;
    });
    
    ${user && user.address ? `
    document.addEventListener('DOMContentLoaded', function() {
      const address = ${JSON.stringify(user.address)};
      if (address) {
        document.querySelector('input[name="address"]').value = address.street || '';
        document.querySelector('input[name="city"]').value = address.city || '';
        document.querySelector('input[name="state"]').value = address.state || '';
        document.querySelector('input[name="pincode"]').value = address.pincode || '';
      }
    });
    ` : ''}
  </script>
</body>
</html>`);
});

// PLACE ORDER
app.post("/place-order", (req, res) => {
  const cart = req.session.cart || [];
  
  if (cart.length === 0) {
    return res.redirect("/cart");
  }
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 999 ? 0 : 49;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;
  
// In the place-order route, add tracking fields
const order = {
    id: Date.now(),
    userId: req.session.userId || null,
    customerName: `${req.body.firstName} ${req.body.lastName}`,
    email: req.body.email,
    phone: req.body.phone,
    address: {
        street: req.body.address,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        country: req.body.country || 'India'
    },
    items: cart.map(item => ({
        slug: item.slug,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
    })),
    subtotal: subtotal.toFixed(2),
    shipping: shipping.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    paymentMethod: req.body.paymentMethod,
    paymentStatus: req.body.paymentMethod === 'cod' ? 'pending' : 'completed',
    orderStatus: 'pending', // pending, processing, shipped, delivered, cancelled
    date: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    
    // TRACKING FIELDS - YEH ADD KAREIN
    trackingNumber: '',
    courierName: '',
    trackingUrl: '',
    trackingUpdates: [
        {
            status: 'Order Placed',
            description: 'Your order has been placed successfully',
            date: new Date().toISOString(),
            location: 'Online'
        }
    ],
    shippingDate: null,
    deliveredDate: null
};
  
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  
  const products = loadPosts();
  cart.forEach(cartItem => {
    const product = products.find(p => p.slug === cartItem.slug);
    if (product && product.stock) {
      product.stock -= cartItem.quantity;
      if (product.stock < 0) product.stock = 0;
    }
  });
  fs.writeFileSync(POSTS_FILE, JSON.stringify(products, null, 2));
  
  req.session.cart = [];
  
  res.redirect(`/order-success/${order.id}`);
});

// ORDER SUCCESS PAGE
app.get("/order-success/:orderId", (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const order = orders.find(o => o.id == req.params.orderId);
  
  if (!order) {
    return res.redirect("/");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Order Confirmed | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .success-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 20px;
      text-align: center;
    }
    
    .success-icon {
      width: 100px;
      height: 100px;
      background: #4caf50;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 50px auto 30px;
      font-size: 50px;
      color: white;
    }
    
    .order-details {
      background: white;
      border-radius: 15px;
      padding: 40px;
      margin: 40px 0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      text-align: left;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid #eee;
    }
    
    .action-buttons {
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-top: 40px;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="success-container">
    <div class="success-icon">✓</div>
    
    <h1 style="font-size: 36px; margin-bottom: 15px;">Order Confirmed!</h1>
    <p style="font-size: 18px; color: #666; margin-bottom: 30px;">
      Thank you for your purchase. Your order has been received and is being processed.
    </p>
    
    <div style="background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
      <h3 style="margin-top: 0;">Order #${order.id}</h3>
      <p>A confirmation email has been sent to ${order.email}</p>
    </div>
    
    <div class="order-details">
      <h2 style="margin-top: 0; margin-bottom: 25px;">Order Details</h2>
      
      <div class="detail-row">
        <span>Order Number</span>
        <span style="font-weight: 600;">#${order.id}</span>
      </div>
      
      <div class="detail-row">
        <span>Order Date</span>
        <span>${order.date}</span>
      </div>
      
      <div class="detail-row">
        <span>Payment Method</span>
        <span>${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                order.paymentMethod === 'card' ? 'Credit/Debit Card' :
                order.paymentMethod === 'upi' ? 'UPI' : 'Net Banking'}</span>
      </div>
      
      <div class="detail-row">
        <span>Payment Status</span>
        <span style="color: ${order.paymentStatus === 'completed' ? '#4caf50' : '#ff9800'}; font-weight: 600;">
          ${order.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
        </span>
      </div>
      
      <div class="detail-row">
        <span>Order Status</span>
        <span style="color: #ff9800; font-weight: 600;">${order.orderStatus}</span>
      </div>
      
      <div class="detail-row">
        <span>Estimated Delivery</span>
        <span style="font-weight: 600;">${order.estimatedDelivery}</span>
      </div>
      
      <div class="detail-row" style="border-bottom: none; font-size: 24px; font-weight: bold; color: #e53935;">
        <span>Total Amount</span>
        <span>₹${order.total}</span>
      </div>
    </div>
    
    <div class="action-buttons">
      <a href="/" class="btn btn-primary">Continue Shopping</a>
      <a href="/profile" class="btn btn-outline">View My Orders</a>
    </div>
    
    <div style="margin-top: 50px; padding: 30px; background: #f8f9fa; border-radius: 15px;">
      <h3 style="margin-top: 0;">What's Next?</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
        <div>
          <div style="font-size: 24px; margin-bottom: 10px;">📦</div>
          <h4>Order Processing</h4>
          <p style="color: #666; font-size: 14px;">We'll prepare your items for shipment within 24 hours.</p>
        </div>
        
        <div>
          <div style="font-size: 24px; margin-bottom: 10px;">🚚</div>
          <h4>Shipping</h4>
          <p style="color: #666; font-size: 14px;">Your order will be dispatched and tracking details will be emailed to you.</p>
        </div>
        
        <div>
          <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
          <h4>Track Your Order</h4>
          <p style="color: #666; font-size: 14px;">Use your order number to track delivery status on our website.</p>
        </div>
      </div>
    </div>
  </div>
  
  ${getFooter()}
</body>
</html>`);
});

// VIEW SINGLE ORDER (FOR ADMIN)
app.get("/order/:orderId", (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const order = orders.find(o => o.id == req.params.orderId);
  
  if (!order) {
    return res.redirect("/admin/orders?error=Order not found");
  }
  
  const isAdmin = req.session.loggedIn;
  const isOwner = req.session.userId && order.userId === req.session.userId;
  
  if (!isAdmin && !isOwner) {
    return res.redirect("/login-user");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Order #${order.id} | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .order-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 30px 0;
      background: white;
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .order-details {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .order-section {
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid #eee;
    }
    
    .order-section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-size: 20px;
      margin-bottom: 20px;
      color: #111;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .info-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 10px;
    }
    
    .info-label {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 18px;
      font-weight: 600;
      color: #111;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }
    
    .status-completed {
      background: #d4edda;
      color: #155724;
    }
    
    .status-processing {
      background: #cce5ff;
      color: #004085;
    }
    
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-cancelled {
      background: #f8d7da;
      color: #721c24;
    }
    
    .order-items {
      width: 100%;
      border-collapse: collapse;
    }
    
    .order-items th {
      background: #f8f9fa;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
    }
    
    .order-items td {
      padding: 15px;
      border-bottom: 1px solid #dee2e6;
      vertical-align: middle;
    }
    
    .order-items tr:last-child td {
      border-bottom: none;
    }
    
    .product-image {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
    }
    
    .order-total {
      margin-top: 30px;
      text-align: right;
    }
    
    .total-row {
      display: flex;
      justify-content: flex-end;
      gap: 30px;
      margin-bottom: 10px;
      padding: 10px 0;
    }
    
    .grand-total {
      font-size: 24px;
      font-weight: bold;
      color: #e53935;
      border-top: 2px solid #eee;
      padding-top: 20px;
      margin-top: 10px;
    }
    
    .action-buttons {
      display: flex;
      gap: 15px;
      margin-top: 30px;
    }
    
    .btn {
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .btn-success {
      background: #28a745;
      color: white;
    }
    
    @media (max-width: 768px) {
      .order-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${isAdmin ? getAdminHeader(req) : getHeader(req)}

  <div class="order-container">
    <div class="order-header">
      <div>
        <h1 style="margin: 0; font-size: 32px;">
          <i class="fas fa-receipt"></i> Order #${order.id}
        </h1>
        <p style="color: #666; margin-top: 5px;">Placed on ${order.date || new Date().toLocaleDateString()}</p>
      </div>
      
      <div>
        <a href="${isAdmin ? '/admin/orders' : '/profile'}" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back to ${isAdmin ? 'Orders' : 'Profile'}
        </a>
      </div>
    </div>

    <div class="order-details">
      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-info-circle"></i> Order Status</h2>
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          <span class="status-badge status-${order.orderStatus || 'pending'}">
            ${(order.orderStatus || 'pending').toUpperCase()}
          </span>
          <span class="status-badge ${order.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}">
            Payment: ${(order.paymentStatus || 'pending').toUpperCase()}
          </span>
          <span style="color: #666;">
            <i class="fas fa-calendar"></i> Estimated Delivery: ${order.estimatedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-user"></i> Customer Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Name</div>
            <div class="info-value">${order.customerName || 'Guest'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${order.email || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone</div>
            <div class="info-value">${order.phone || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-map-marker-alt"></i> Shipping Address</h2>
        <div class="info-item" style="background: #f8f9fa; padding: 20px;">
          <div>${order.address?.street || ''}</div>
          <div>${order.address?.city || ''}, ${order.address?.state || ''}</div>
          <div>PIN: ${order.address?.pincode || ''}</div>
          <div>${order.address?.country || 'India'}</div>
        </div>
      </div>

      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-credit-card"></i> Payment Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Payment Method</div>
            <div class="info-value">
              ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                order.paymentMethod === 'card' ? 'Credit/Debit Card' :
                order.paymentMethod === 'upi' ? 'UPI' : 
                order.paymentMethod === 'netbanking' ? 'Net Banking' : 'N/A'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Status</div>
            <div class="info-value">
              <span class="status-badge ${order.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}" style="padding: 5px 12px;">
                ${(order.paymentStatus || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-box"></i> Order Items</h2>
        <div style="overflow-x: auto;">
          <table class="order-items">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items && order.items.map(item => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 15px;">
                    ${item.image ? `
                    <img src="${item.image}" class="product-image">
                    ` : `
                    <div style="width: 60px; height: 60px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                      <i class="fas fa-box" style="color: #6c757d;"></i>
                    </div>
                    `}
                    <div>
                      <div style="font-weight: 600;">${item.name}</div>
                      <small style="color: #666;">SKU: ${item.slug}</small>
                    </div>
                  </div>
                </td>
                <td style="font-weight: 600;">₹${item.price}</td>
                <td>${item.quantity}</td>
                <td style="font-weight: 600; color: #e53935;">₹${item.price * item.quantity}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="order-total">
          <div class="total-row">
            <span style="font-weight: 600;">Subtotal:</span>
            <span>₹${order.subtotal || 0}</span>
          </div>
          <div class="total-row">
            <span style="font-weight: 600;">Shipping:</span>
            <span>₹${order.shipping || 0}</span>
          </div>
          <div class="total-row">
            <span style="font-weight: 600;">Tax (GST 18%):</span>
            <span>₹${order.tax || 0}</span>
          </div>
          <div class="grand-total">
            <span>Total:</span>
            <span>₹${order.total || 0}</span>
          </div>
        </div>
      </div>

      ${isAdmin ? `
      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-tasks"></i> Admin Actions</h2>
        <div class="action-buttons">
          <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'completed')">
            <i class="fas fa-check"></i> Mark as Completed
          </button>
          <button class="btn btn-primary" onclick="updateOrderStatus('${order.id}', 'processing')">
            <i class="fas fa-cog"></i> Mark as Processing
          </button>
          <button class="btn btn-secondary" onclick="updateOrderStatus('${order.id}', 'pending')">
            <i class="fas fa-clock"></i> Mark as Pending
          </button>
          <button class="btn btn-danger" onclick="updateOrderStatus('${order.id}', 'cancelled')">
            <i class="fas fa-times"></i> Cancel Order
          </button>
        </div>
      </div>
      ` : ''}
    </div>
  </div>

  ${getFooter()}
  
  <script>
    function updateOrderStatus(orderId, status) {
      if (confirm(\`Are you sure you want to mark this order as \${status}?\`)) {
        fetch('/admin/update-order-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId, status })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Order status updated successfully!');
            location.reload();
          } else {
            alert('Error updating order status');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Network error - please try again');
        });
      }
    }
  </script>
</body>
</html>`);
});

// UPDATE ORDER STATUS (ADMIN)
app.post("/admin/update-order-status", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  const { orderId, status } = req.body;
  
  try {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
    
    const orderIndex = orders.findIndex(o => o.id == orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Update order status
    orders[orderIndex].orderStatus = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    // ============================================
// TRACKING API ENDPOINTS - YE ADD KAREIN
// ============================================

// GET TRACKING DETAILS
app.get("/admin/get-tracking/:orderId", (req, res) => {
    if (!req.session.loggedIn) {
        return res.status(401).json({ error: "Not authorized" });
    }
    
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
    const order = orders.find(o => o.id == req.params.orderId);
    
    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
        success: true,
        orderStatus: order.orderStatus || 'pending',
        courierName: order.courierName || '',
        trackingNumber: order.trackingNumber || '',
        trackingUrl: order.trackingUrl || '',
        estimatedDelivery: order.estimatedDelivery || '',
        trackingUpdates: order.trackingUpdates || []
    });
});

// UPDATE TRACKING DETAILS
app.post("/admin/update-tracking", (req, res) => {
    if (!req.session.loggedIn) {
        return res.status(401).json({ error: "Not authorized" });
    }
    
    const { 
        orderId, 
        orderStatus, 
        courierName, 
        trackingNumber, 
        trackingUrl, 
        estimatedDelivery,
        trackingUpdate,
        currentLocation 
    } = req.body;
    
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
    const orderIndex = orders.findIndex(o => o.id == orderId);
    
    if (orderIndex === -1) {
        return res.status(404).json({ error: "Order not found" });
    }
    
    // Update order status
    orders[orderIndex].orderStatus = orderStatus;
    
    // Update tracking fields
    if (courierName) orders[orderIndex].courierName = courierName;
    if (trackingNumber) orders[orderIndex].trackingNumber = trackingNumber;
    if (trackingUrl) orders[orderIndex].trackingUrl = trackingUrl;
    if (estimatedDelivery) orders[orderIndex].estimatedDelivery = estimatedDelivery;
    
    // Add tracking update if provided
    if (trackingUpdate) {
        if (!orders[orderIndex].trackingUpdates) {
            orders[orderIndex].trackingUpdates = [];
        }
        
        orders[orderIndex].trackingUpdates.push({
            status: orderStatus,
            description: trackingUpdate,
            location: currentLocation || 'N/A',
            date: new Date().toISOString()
        });
    }
    
    // Update shipping/delivery dates based on status
    if (orderStatus === 'shipped' && !orders[orderIndex].shippingDate) {
        orders[orderIndex].shippingDate = new Date().toISOString();
    }
    
    if (orderStatus === 'delivered') {
        orders[orderIndex].deliveredDate = new Date().toISOString();
        orders[orderIndex].paymentStatus = 'completed';
    }
    
    orders[orderIndex].updatedAt = new Date().toISOString();
    
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    
    res.json({ success: true });
});
    
    // If status is completed, update payment status too
    if (status === 'completed') {
      orders[orderIndex].paymentStatus = 'completed';
    }
    
    // Save to file
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    
    console.log(`Order ${orderId} status updated to ${status}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE CART ITEM QUANTITY
app.post("/update-cart-item", (req, res) => {
  const { index, quantity } = req.body;
  
  if (!req.session.cart) {
    req.session.cart = [];
    return res.json({ success: false, error: "Cart not found" });
  }
  
  const cart = req.session.cart;
  
  if (cart[index]) {
    // Ensure quantity is at least 1
    const newQuantity = Math.max(1, parseInt(quantity) || 1);
    cart[index].quantity = newQuantity;
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.json({ success: false, error: "Failed to update cart" });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: false, error: "Item not found" });
  }
});
// LOGIN PAGE (User)
app.get("/login-user", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/profile");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Login | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .auth-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .auth-box {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
      margin: 50px 0;
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .auth-tabs {
      display: flex;
      margin-bottom: 30px;
      border-bottom: 2px solid #eee;
    }
    
    .auth-tab {
      flex: 1;
      padding: 15px;
      background: none;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      color: #666;
      border-bottom: 3px solid transparent;
    }
    
    .auth-tab.active {
      color: #e53935;
      border-bottom-color: #e53935;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .auth-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 18px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .auth-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .auth-divider {
      text-align: center;
      margin: 30px 0;
      position: relative;
    }
    
    .auth-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #eee;
    }
    
    .auth-divider span {
      background: white;
      padding: 0 20px;
      color: #666;
    }
    
    .social-login {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .social-btn {
      flex: 1;
      padding: 15px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    
    .social-btn.google:hover {
      border-color: #db4437;
      color: #db4437;
    }
    
    .social-btn.facebook:hover {
      border-color: #4267B2;
      color: #4267B2;
    }
    
    .auth-footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
    }
    
    .auth-footer a {
      color: #e53935;
      font-weight: 600;
      text-decoration: none;
    }
    
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getHeader(req)}
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1 style="font-size: 36px; margin-bottom: 10px;">Welcome Back!</h1>
        <p style="color: #666;">Login to your Sports India account</p>
      </div>
      
      ${req.query.error ? `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i> ${req.query.error}
      </div>
      ` : ''}
      
      ${req.query.success ? `
      <div class="success-message">
        <i class="fas fa-check-circle"></i> ${req.query.success}
      </div>
      ` : ''}
      
      <div class="auth-tabs">
        <button class="auth-tab active" onclick="window.location.href='/login-user'">Login</button>
        <button class="auth-tab" onclick="window.location.href='/register'">Register</button>
      </div>
      
      <form method="POST" action="/login-user" id="loginForm">
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-input" placeholder="Enter your password" required>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="remember">
            <span>Remember me</span>
          </label>
          <a href="/forgot-password" style="color: #e53935; text-decoration: none;">Forgot password?</a>
        </div>
        
        <button type="submit" class="auth-btn">Login</button>
      </form>
      
      <div class="auth-divider">
        <span>Or continue with</span>
      </div>
      
     <div class="social-login">

<a href="/auth/google">
<button type="button" class="social-btn google">
<i class="fab fa-google"></i>
Google
</button>
</a>



</div>

      
      <div class="auth-footer">
        <p>Don't have an account? <a href="/register">Sign up now</a></p>
      </div>
    </div>
  </div>
  
  ${getFooter()}
  
  <script>
    // Form validation
    document.getElementById('loginForm')?.addEventListener('submit', function(e) {
      const email = document.querySelector('input[name="email"]').value;
      const password = document.querySelector('input[name="password"]').value;
      
      if (!email || !password) {
        e.preventDefault();
        alert('Please fill in all fields');
        return false;
      }
      
      if (!email.includes('@')) {
        e.preventDefault();
        alert('Please enter a valid email address');
        return false;
      }
      
      return true;
    });
  </script>
</body>
</html>`);
});
// LOGIN USER POST - IMPROVED VERSION
app.post("/login-user", loginLimiter, async (req,res)=>{
  const { email, password } = req.body;
  
  console.log("Login attempt for email:", email);
  
  // Validate input
  if (!email || !password) {
    console.log("Missing email or password");
    return res.redirect("/login-user?error=Email and password are required");
  }
  
  const users = loadUsers();
  console.log("Total users:", users.length);
  
  // Find user by email (case insensitive)
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    console.log("User not found:", email);
    return res.redirect("/login-user?error=Invalid email or password");
  }
  
  console.log("User found:", user.name);
  if(user.lockUntil && user.lockUntil > Date.now()){
  return res.send("Account locked. Try again later");
}
  // Check password
  if (!(await comparePassword(password, user.password))) {

  console.log("Invalid password for user:", email);

  user.loginAttempts = (user.loginAttempts || 0) + 1;

  if (user.loginAttempts >= 5) {
    user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  return res.redirect("/login-user?error=Invalid email or password");
}
  // successful login
user.loginAttempts = 0;
user.lockUntil = null;

fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

req.session.userId = user.id;
req.session.loggedIn = true;

res.redirect("/profile");
  

});
// ============================================
// FORGOT PASSWORD PAGE
// ============================================
app.get("/forgot-password", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/profile");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Forgot Password | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .auth-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .auth-box {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
      margin: 50px 0;
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .auth-header h1 {
      font-size: 32px;
      color: #111;
      margin-bottom: 10px;
    }
    
    .auth-header p {
      color: #666;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .auth-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 18px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 15px;
    }
    
    .auth-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .back-link {
      text-align: center;
      margin-top: 20px;
    }
    
    .back-link a {
      color: #666;
      text-decoration: none;
      font-size: 14px;
    }
    
    .back-link a:hover {
      color: #e53935;
    }
    
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .info-box {
      background: #e7f3ff;
      border-left: 4px solid #2196f3;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 14px;
      color: #0c5460;
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getHeader(req)}
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1><i class="fas fa-key"></i> Forgot Password?</h1>
        <p>Enter your email to reset your password</p>
      </div>
      
      ${req.query.error ? `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i> ${req.query.error}
      </div>
      ` : ''}
      
      ${req.query.success ? `
      <div class="success-message">
        <i class="fas fa-check-circle"></i> ${req.query.success}
      </div>
      ` : ''}
      
      <div class="info-box">
        <i class="fas fa-info-circle"></i> 
        Enter your registered email address. We'll send you instructions to reset your password.
      </div>
      
      <form method="POST" action="/forgot-password" id="forgotForm">
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
        </div>
        
        <button type="submit" class="auth-btn">Send Reset Instructions</button>
      </form>
      
      <div class="back-link">
        <a href="/login-user"><i class="fas fa-arrow-left"></i> Back to Login</a>
      </div>
    </div>
  </div>
  
  ${getFooter()}
  
  <script>
    document.getElementById('forgotForm')?.addEventListener('submit', function(e) {
      const email = document.querySelector('input[name="email"]').value;
      
      if (!email.includes('@')) {
        e.preventDefault();
        alert('Please enter a valid email address');
        return false;
      }
      
      return true;
    });
  </script>
</body>
</html>`);
});

// ============================================
// FORGOT PASSWORD POST ROUTE
// ============================================
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  
  console.log("Password reset requested for email:", email);
  
  if (!email || !email.includes('@')) {
    return res.redirect("/forgot-password?error=Please enter a valid email address");
  }
  
  const users = loadUsers();
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    console.log("Email not found:", email);
    // Don't reveal if email exists or not for security
    return res.redirect("/forgot-password?success=If your email is registered, you will receive reset instructions");
  }
  
  console.log("User found:", user.name);
  
  // Generate reset token (simple implementation)
  const resetToken = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
  const resetExpiry = Date.now() + 3600000; // 1 hour from now
  
  // Store reset token in user object
  user.resetToken = resetToken;
  user.resetExpiry = resetExpiry;
  
  // Save users file
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  // In a real application, you would send an email here
  console.log("Reset token generated:", resetToken);
  console.log("Reset link: http://localhost:3000/reset-password?token=" + resetToken);
  
  // For demo purposes, show the reset link
  res.redirect("/forgot-password?success=Password reset link has been sent to your email (Demo: Check console for reset link)");
});

// ============================================
// RESET PASSWORD PAGE
// ============================================
app.get("/reset-password", (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.redirect("/forgot-password?error=Invalid reset link");
  }
  
  const users = loadUsers();
  const user = users.find(u => u.resetToken === token);
  
  if (!user) {
    return res.redirect("/forgot-password?error=Invalid or expired reset link");
  }
  
  // Check if token has expired
  if (user.resetExpiry && user.resetExpiry < Date.now()) {
    return res.redirect("/forgot-password?error=Reset link has expired");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Reset Password | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .auth-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .auth-box {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
      margin: 50px 0;
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .auth-header h1 {
      font-size: 32px;
      color: #111;
      margin-bottom: 10px;
    }
    
    .auth-header p {
      color: #666;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .auth-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 18px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .auth-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .password-strength {
      margin-top: 5px;
      height: 4px;
      background: #eee;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .strength-bar {
      height: 100%;
      width: 0%;
      transition: width 0.3s;
    }
    
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1><i class="fas fa-lock"></i> Reset Password</h1>
        <p>Enter your new password</p>
      </div>
      
      ${req.query.error ? `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i> ${req.query.error}
      </div>
      ` : ''}
      
      <form method="POST" action="/reset-password" id="resetForm">
        <input type="hidden" name="token" value="${token}">
        
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" name="password" id="password" class="form-input" placeholder="Enter new password" required oninput="checkPasswordStrength()">
          <div class="password-strength">
            <div class="strength-bar" id="strengthBar"></div>
          </div>
          <small style="color: #666; display: block; margin-top: 5px;">
            Must be at least 8 characters with letters and numbers
          </small>
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input type="password" name="confirmPassword" class="form-input" placeholder="Confirm new password" required>
        </div>
        
        <button type="submit" class="auth-btn">Reset Password</button>
      </form>
    </div>
  </div>
  
  ${getFooter()}
  
  <script>
    function checkPasswordStrength() {
      const password = document.getElementById('password').value;
      const strengthBar = document.getElementById('strengthBar');
      let strength = 0;
      
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      
      strengthBar.style.width = strength + '%';
      
      if (strength < 50) {
        strengthBar.style.backgroundColor = '#dc3545';
      } else if (strength < 75) {
        strengthBar.style.backgroundColor = '#ffc107';
      } else {
        strengthBar.style.backgroundColor = '#28a745';
      }
    }
    
    document.getElementById('resetForm').addEventListener('submit', function(e) {
      const password = document.querySelector('input[name="password"]').value;
      const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;
      
      if (password !== confirmPassword) {
        e.preventDefault();
        alert('Passwords do not match!');
        return false;
      }
      
      if (password.length < 8) {
        e.preventDefault();
        alert('Password must be at least 8 characters long!');
        return false;
      }
      
      return true;
    });
  </script>
</body>
</html>`);
});

// ============================================
// RESET PASSWORD POST ROUTE
// ============================================
app.post("/reset-password", (req, res) => {
  const { token, password, confirmPassword } = req.body;
  
  console.log("Password reset attempt with token:", token);
  
  if (!token) {
    return res.redirect("/forgot-password?error=Invalid reset link");
  }
  
  if (password !== confirmPassword) {
    return res.redirect("/reset-password?token=" + token + "&error=Passwords do not match");
  }
  
  if (password.length < 8) {
    return res.redirect("/reset-password?token=" + token + "&error=Password must be at least 8 characters");
  }
  
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.resetToken === token);
  
  if (userIndex === -1) {
    return res.redirect("/forgot-password?error=Invalid or expired reset link");
  }
  
  // Check if token has expired
  if (users[userIndex].resetExpiry && users[userIndex].resetExpiry < Date.now()) {
    return res.redirect("/forgot-password?error=Reset link has expired");
  }
  
  // Update password
  users[userIndex].password = hashPassword(password);
  users[userIndex].updatedAt = new Date().toISOString();
  
  // Clear reset token
  delete users[userIndex].resetToken;
  delete users[userIndex].resetExpiry;
  
  // Save users file
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  console.log("Password reset successful for user:", users[userIndex].email);
  
  res.redirect("/login-user?success=Password reset successful! Please login with your new password");
});


// REGISTER PAGE
app.get("/register", (req, res) => {

  if (req.session.userId) {
    return res.redirect("/profile");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Register | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .auth-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .auth-box {
      background: white;
      padding: 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
      margin: 50px 0;
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .auth-tabs {
      display: flex;
      margin-bottom: 30px;
      border-bottom: 2px solid #eee;
    }
    
    .auth-tab {
      flex: 1;
      padding: 15px;
      background: none;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      color: #666;
      border-bottom: 3px solid transparent;
    }
    
    .auth-tab.active {
      color: #e53935;
      border-bottom-color: #e53935;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .auth-btn {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 18px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .auth-btn:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .terms-check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 25px;
    }
    
    .terms-check input[type="checkbox"] {
      margin-top: 5px;
    }
    
    .terms-check label {
      font-size: 14px;
      color: #666;
    }
    
    .terms-check a {
      color: #e53935;
      text-decoration: none;
    }
    
    .auth-footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
    }
    
    .auth-footer a {
      color: #e53935;
      font-weight: 600;
      text-decoration: none;
    }
    
    .password-strength {
      margin-top: 5px;
      height: 4px;
      background: #eee;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .strength-bar {
      height: 100%;
      width: 0%;
      transition: width 0.3s;
    }
    
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  ${getHeader(req)}
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1 style="font-size: 36px; margin-bottom: 10px;">Create Account</h1>
        <p style="color: #666;">Join Sports India for exclusive benefits</p>
      </div>
      
      ${req.query.error ? `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i> ${req.query.error}
      </div>
      ` : ''}
      
      ${req.query.success ? `
      <div class="success-message">
        <i class="fas fa-check-circle"></i> ${req.query.success}
      </div>
      ` : ''}
      
      <div class="auth-tabs">
        <button class="auth-tab" onclick="window.location.href='/login-user'">Login</button>
        <button class="auth-tab active">Register</button>
      </div>
      
      <form method="POST" action="/register" id="registerForm">

<!-- CSRF TOKEN -->
<!-- RECAPTCHA SCRIPT -->
<script src="https://www.google.com/recaptcha/api.js" async defer></script>

<div class="form-row">
  <div class="form-group">
    <label class="form-label">First Name *</label>
    <input type="text" name="firstName" class="form-input" placeholder="Enter first name" required>
  </div>

  <div class="form-group">
    <label class="form-label">Last Name *</label>
    <input type="text" name="lastName" class="form-input" placeholder="Enter last name" required>
  </div>
</div>

<div class="form-group">
  <label class="form-label">Email Address *</label>
  <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
</div>

<div class="form-group">
  <label class="form-label">Phone Number</label>
  <input type="tel" name="phone" class="form-input" placeholder="Enter phone number (optional)">
</div>

<div class="form-group">
  <label class="form-label">Password *</label>
  <input type="password" name="password" id="password" class="form-input" placeholder="Create a password" required oninput="checkPasswordStrength()">

  <div class="password-strength">
    <div class="strength-bar" id="strengthBar"></div>
  </div>

  <small style="color:#666;display:block;margin-top:5px;">
    Must be at least 8 characters with letters and numbers
  </small>
</div>

<div class="form-group">
  <label class="form-label">Confirm Password *</label>
  <input type="password" name="confirmPassword" class="form-input" placeholder="Confirm password" required>
</div>

<div class="terms-check">
  <input type="checkbox" id="terms" name="terms" required>
  <label for="terms">
    I agree to the 
    <a href="/terms" target="_blank">Terms & Conditions</a> 
    and 
    <a href="/privacy-policy" target="_blank">Privacy Policy</a>
  </label>
</div>

<div class="terms-check">
  <input type="checkbox" id="newsletter" name="newsletter" checked>
  <label for="newsletter">
    Subscribe to newsletter for exclusive offers and updates
  </label>
</div>

<!-- RECAPTCHA -->
<div style="margin-top:15px">
  <div class="g-recaptcha" data-sitekey="6Lfae4osAAAAADLo5H-aOUJZoVvjLp6p4A5FAu1R"></div>
</div>

<br>

<button type="submit" class="auth-btn">
Create Account
</button>

</form>
      
      <div class="auth-footer">
        <p>Already have an account? <a href="/login-user">Login here</a></p>
      </div>
    </div>
  </div>
  
  ${getFooter()}
  
  <script>
    function checkPasswordStrength() {
      const password = document.getElementById('password').value;
      const strengthBar = document.getElementById('strengthBar');
      let strength = 0;
      
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      
      strengthBar.style.width = strength + '%';
      
      if (strength < 50) {
        strengthBar.style.backgroundColor = '#dc3545';
      } else if (strength < 75) {
        strengthBar.style.backgroundColor = '#ffc107';
      } else {
        strengthBar.style.backgroundColor = '#28a745';
      }
    }
    
    document.getElementById('registerForm').addEventListener('submit', function(e) {
      const password = document.querySelector('input[name="password"]').value;
      const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;
      const terms = document.getElementById('terms').checked;
      
      if (!terms) {
        e.preventDefault();
        alert('You must agree to the Terms & Conditions');
        return false;
      }
      
      if (password !== confirmPassword) {
        e.preventDefault();
        alert('Passwords do not match!');
        return false;
      }
      
      if (password.length < 8) {
        e.preventDefault();
        alert('Password must be at least 8 characters long!');
        return false;
      }
      
      return true;
    });
  </script>
</body>
</html>`);
});


// REGISTER POST - IMPROVED VERSION
app.post("/register", async (req, res) => {
  try {
    // 🔹 FORM DATA EXTRACT KARO
    const { firstName, lastName, email, phone, password, confirmPassword, terms, newsletter } = req.body;

    // 🔹 BASIC VALIDATION
    if (!firstName || !lastName || !email || !password) {
      return res.redirect("/register?error=All required fields must be filled");
    }
    if (password !== confirmPassword) {
      return res.redirect("/register?error=Passwords do not match");
    }
    if (password.length < 8) {
      return res.redirect("/register?error=Password must be at least 8 characters");
    }
    if (!terms) {
      return res.redirect("/register?error=You must accept terms and conditions");
    }

    // 🔹 RECAPTCHA VERIFICATION
    const axios = require("axios");
    const captcha = req.body["g-recaptcha-response"];
    const verify = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`
    );
    if (!verify.data.success) {
      return res.redirect("/register?error=Captcha failed");
    }

    // 🔹 CHECK IF EMAIL ALREADY EXISTS
    const users = loadUsers();
    if (users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
      return res.redirect("/register?error=Email already registered");
    }

    // 🔹 GENERATE OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // 🔹 SAVE PENDING USER IN SESSION
    req.session.pendingUser = {
      firstName,
      lastName,
      email,
      phone,
      password   // plain password, will hash after OTP verification
    };
    req.session.otp = otp;

    // 🔹 SEND OTP EMAIL (with error handling)
    await transporter.sendMail({
      to: email,
      subject: "Sports India Email Verification",
      text: `Your OTP for registration is ${otp}. It is valid for 10 minutes.`
    });

    res.redirect("/verify-otp");
  } catch (error) {
    console.error("Registration error:", error);
    res.redirect("/register?error=Something went wrong. Please try again.");
  }
});
app.get("/verify-otp",(req,res)=>{

  res.send(`
  <h2>Email Verification</h2>

  <form method="POST" action="/verify-otp">

  <input type="text" name="otp" placeholder="Enter OTP" required>

  <button type="submit">Verify OTP</button>

  </form>

  `);

});
app.post("/verify-otp", async (req,res)=>{

  const { otp } = req.body;

  if(otp != req.session.otp){
    return res.redirect("/verify-otp?error=Invalid OTP");
  }

  const users = loadUsers();

  const user = req.session.pendingUser;

  const hashedPassword = await bcrypt.hash(user.password,10);

  const newUser = {
    id: Date.now().toString(),
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    password: hashedPassword,
    loginAttempts: 0,
lockUntil: null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  fs.writeFileSync(USERS_FILE, JSON.stringify(users,null,2));

  req.session.userId = newUser.id;
  req.session.loggedIn = true;

  res.redirect("/profile");

});

// ADD TO CART FUNCTIONALITY
app.post("/add-to-cart/:slug", (req, res) => {
  const products = loadPosts();
  const product = products.find(p => p.slug === req.params.slug);
  
  if (!product) {
    return res.redirect("/");
  }
  
  if (!req.session.cart) {
    req.session.cart = [];
  }
  
  const cart = req.session.cart;
  const existingItem = cart.find(item => item.slug === product.slug);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      quantity: 1,
      stock: product.stock || 0
    });
  }
  
  req.session.cart = cart;
  res.redirect("/cart");
});

// REMOVE FROM CART
app.post("/remove-from-cart/:index", (req, res) => {
  const cart = req.session.cart || [];
  const index = parseInt(req.params.index);
  
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    req.session.cart = cart;
  }
  
  res.redirect("/cart");
});

// PROFILE PAGE
app.get("/profile", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const userOrders = orders.filter(o => o.userId === req.session.userId);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>My Profile | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .profile-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .profile-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .profile-avatar {
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: white;
      font-size: 48px;
      font-weight: bold;
    }
    
    .profile-content {
      display: flex;
      gap: 30px;
    }
    
    .profile-sidebar {
      width: 300px;
      flex-shrink: 0;
    }
    
    .profile-main {
      flex: 1;
    }
    
    .profile-nav {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
      color: #333;
      text-decoration: none;
      transition: all 0.3s;
    }
    
    .nav-item:hover, .nav-item.active {
      background: rgba(229,57,53,0.1);
      color: #e53935;
    }
    
    .nav-item i {
      width: 25px;
      margin-right: 15px;
      font-size: 18px;
    }
    
    .profile-card {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .order-item {
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="profile-container">
    <div class="profile-header">
      <div class="profile-avatar">
        ${user?.name?.charAt(0).toUpperCase() || 'U'}
      </div>
      <h1 style="font-size: 36px; margin-bottom: 10px;">${user?.name || 'User'}</h1>
      <p style="color: #666;">Member since ${user ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}</p>
    </div>
    
    <div class="profile-content">
      <div class="profile-sidebar">
        <div class="profile-nav">
          <a href="#" class="nav-item active">
            <i class="fas fa-user"></i>
            <span>Profile Information</span>
          </a>
          <a href="/orders" class="nav-item">
            <i class="fas fa-shopping-cart"></i>
            <span>My Orders (${userOrders.length})</span>
          </a>
          <a href="/wishlist" class="nav-item">
            <i class="fas fa-heart"></i>
            <span>Wishlist</span>
          </a>
          <a href="/addresses" class="nav-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>Address Book</span>
          </a>
          <a href="/logout" class="nav-item">
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </a>
        </div>
      </div>
      
      <div class="profile-main">
        <div class="profile-card">
          <h2 style="margin-top: 0; margin-bottom: 25px;">Personal Information</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div>
              <label style="display: block; color: #666; margin-bottom: 5px;">Full Name</label>
              <div style="font-size: 18px; font-weight: 600;">${user?.name || 'Not set'}</div>
            </div>
            
            <div>
              <label style="display: block; color: #666; margin-bottom: 5px;">Email Address</label>
              <div style="font-size: 18px; font-weight: 600;">${user?.email || 'Not set'}</div>
            </div>
            
            <div>
              <label style="display: block; color: #666; margin-bottom: 5px;">Phone Number</label>
              <div style="font-size: 18px; font-weight: 600;">${user?.phone || 'Not set'}</div>
            </div>
            
            <div>
              <label style="display: block; color: #666; margin-bottom: 5px;">Account Status</label>
              <div style="font-size: 18px; font-weight: 600; color: #28a745;">Active</div>
            </div>
          </div>
          
          <a href="/update-profile" style="display: inline-block; background: #e53935; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            <i class="fas fa-edit"></i> Edit Profile
          </a>
        </div>
        
        ${userOrders.length > 0 ? `
        <div class="profile-card">
          <h2 style="margin-top: 0; margin-bottom: 25px;">Recent Orders</h2>
          
          ${userOrders.slice(-3).reverse().map(order => `
          <div class="order-item">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <div>
                <div style="font-weight: 600; font-size: 18px;">Order #${order.id}</div>
                <div style="color: #666; font-size: 14px;">${order.date}</div>
              </div>
              <div style="font-weight: 600; color: #e53935; font-size: 20px;">₹${order.total}</div>
            </div>
            
            <div style="color: #666; margin-bottom: 15px;">
              ${order.items.length} items • Status: 
              <span style="color: #28a745; font-weight: 600;">Completed</span>
            </div>
            
            <a href="/order/${order.id}" style="color: #e53935; text-decoration: none; font-weight: 600;">
              View Order Details →
            </a>
          </div>
          `).join('')}
          
          ${userOrders.length > 3 ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="/orders" style="color: #e53935; text-decoration: none; font-weight: 600;">
              View All Orders (${userOrders.length})
            </a>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  
  ${getFooter()}
</body>
</html>`);
});

// UPDATE PROFILE PAGE
app.get("/update-profile", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);
  
  if (!user) {
    return res.redirect("/profile");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Update Profile | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .profile-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .profile-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .profile-avatar {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: white;
      font-size: 40px;
      font-weight: bold;
    }
    
    .form-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
      width: 100%;
    }
    
    .btn-primary:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 30px;
    }
    
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .form-actions {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="profile-container">
    <div class="profile-header">
      <div class="profile-avatar">
        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>
      <h1 style="font-size: 36px; margin-bottom: 10px;">Update Profile</h1>
      <p style="color: #666;">Edit your personal information</p>
    </div>
    
    <div class="form-card">
      <form method="POST" action="/update-profile" id="updateProfileForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input type="text" name="firstName" class="form-input" 
                   value="${user.name ? user.name.split(' ')[0] : ''}" 
                   placeholder="Enter first name" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input type="text" name="lastName" class="form-input" 
                   value="${user.name ? user.name.split(' ').slice(1).join(' ') : ''}" 
                   placeholder="Enter last name" required>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" name="email" class="form-input" 
                 value="${user.email || ''}" 
                 placeholder="Enter your email" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" name="phone" class="form-input" 
                 value="${user.phone || ''}" 
                 placeholder="Enter phone number">
        </div>
        
        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" name="addressStreet" class="form-input" 
                 value="${user.address ? user.address.street : ''}" 
                 placeholder="Street address">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <input type="text" name="addressCity" class="form-input" 
                   value="${user.address ? user.address.city : ''}" 
                   placeholder="City">
          </div>
          
          <div class="form-group">
            <input type="text" name="addressState" class="form-input" 
                   value="${user.address ? user.address.state : ''}" 
                   placeholder="State">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <input type="text" name="addressPincode" class="form-input" 
                   value="${user.address ? user.address.pincode : ''}" 
                   placeholder="PIN Code">
          </div>
          
          <div class="form-group">
            <input type="text" name="addressCountry" class="form-input" 
                   value="${user.address ? user.address.country : 'India'}" 
                   placeholder="Country">
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Update Profile
          </button>
          <a href="/profile" class="btn btn-outline" style="text-align: center; text-decoration: none; padding: 15px 30px;">
            Cancel
          </a>
        </div>
      </form>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="/change-password" style="color: #e53935; text-decoration: none;">Change Password</a>
    </div>
  </div>

  ${getFooter()}
  
  <script>
    document.getElementById('updateProfileForm').addEventListener('submit', function(e) {
      const email = document.querySelector('input[name="email"]').value;
      if (!email.includes('@')) {
        e.preventDefault();
        alert('Please enter a valid email address');
        return false;
      }
      return true;
    });
  </script>
</body>
</html>`);
});

// UPDATE PROFILE PROCESSING
app.post("/update-profile", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === req.session.userId);
  
  if (userIndex === -1) {
    return res.redirect("/profile");
  }
  
  users[userIndex].name = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim();
  users[userIndex].email = req.body.email;
  users[userIndex].phone = req.body.phone || '';
  
  if (!users[userIndex].address) {
    users[userIndex].address = {};
  }
  
  users[userIndex].address.street = req.body.addressStreet || '';
  users[userIndex].address.city = req.body.addressCity || '';
  users[userIndex].address.state = req.body.addressState || '';
  users[userIndex].address.pincode = req.body.addressPincode || '';
  users[userIndex].address.country = req.body.addressCountry || 'India';
  
  users[userIndex].updatedAt = new Date().toISOString();
  
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  req.session.userName = users[userIndex].name;
  req.session.userEmail = users[userIndex].email;
  
  res.redirect("/profile?success=Profile updated successfully");
});

// CHANGE PASSWORD PAGE
app.get("/change-password", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Change Password | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .password-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .password-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .form-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 50px;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    .form-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 16px;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      background: #e53935;
      color: white;
      font-size: 16px;
    }
    
    .btn:hover {
      background: #c62828;
    }
    
    .password-strength {
      margin-top: 5px;
      height: 4px;
      background: #eee;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .strength-bar {
      height: 100%;
      width: 0%;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="password-container">
    <div class="password-header">
      <h1 style="font-size: 36px; margin-bottom: 10px;">Change Password</h1>
      <p style="color: #666;">Update your password to keep your account secure</p>
    </div>
    
    <div class="form-card">
      <form method="POST" action="/change-password" id="changePasswordForm">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" name="currentPassword" class="form-input" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" name="newPassword" id="newPassword" class="form-input" required oninput="checkPasswordStrength()">
          <div class="password-strength">
            <div class="strength-bar" id="strengthBar"></div>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" name="confirmPassword" class="form-input" required>
        </div>
        
        <button type="submit" class="btn">Update Password</button>
      </form>
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="/profile" style="color: #666; text-decoration: none;">← Back to Profile</a>
      </div>
    </div>
  </div>

  ${getFooter()}
  
  <script>
    function checkPasswordStrength() {
      const password = document.getElementById('newPassword').value;
      const strengthBar = document.getElementById('strengthBar');
      let strength = 0;
      
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      
      strengthBar.style.width = strength + '%';
      
      if (strength < 50) {
        strengthBar.style.backgroundColor = '#dc3545';
      } else if (strength < 75) {
        strengthBar.style.backgroundColor = '#ffc107';
      } else {
        strengthBar.style.backgroundColor = '#28a745';
      }
    }
    
    document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
      const newPassword = document.querySelector('input[name="newPassword"]').value;
      const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;
      
      if (newPassword !== confirmPassword) {
        e.preventDefault();
        alert('New passwords do not match!');
        return false;
      }
      
      if (newPassword.length < 8) {
        e.preventDefault();
        alert('Password must be at least 8 characters long!');
        return false;
      }
      
      return true;
    });
  </script>
</body>
</html>`);
});

// CHANGE PASSWORD PROCESSING
app.post("/change-password", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === req.session.userId);
  
  if (userIndex === -1) {
    return res.redirect("/profile");
  }
  
  const { currentPassword, newPassword } = req.body;
  
  if (!comparePassword(currentPassword, users[userIndex].password)) {
    return res.redirect("/change-password?error=Current password is incorrect");
  }
  
  users[userIndex].password = hashPassword(newPassword);
  users[userIndex].updatedAt = new Date().toISOString();
  
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  res.redirect("/profile?success=Password updated successfully");
});

// ORDERS PAGE (User's Order History)
app.get("/orders", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const userOrders = orders.filter(o => o.userId === req.session.userId).reverse();
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>My Orders | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .orders-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .orders-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .orders-header h1 {
      font-size: 42px;
      margin-bottom: 10px;
    }
    
    .orders-header p {
      color: #666;
      font-size: 18px;
    }
    
    .orders-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 5px;
    }
    
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    
    .order-card {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      overflow: hidden;
    }
    
    .order-header {
      background: #f8f9fa;
      padding: 20px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .order-id {
      font-size: 18px;
      font-weight: 600;
      color: #111;
    }
    
    .order-date {
      color: #666;
      font-size: 14px;
    }
    
    .order-status {
      padding: 6px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-processing {
      background: #cce5ff;
      color: #004085;
    }
    
    .status-completed {
      background: #d4edda;
      color: #155724;
    }
    
    .status-cancelled {
      background: #f8d7da;
      color: #721c24;
    }
    
    .order-body {
      padding: 25px;
    }
    
    .order-items {
      margin-bottom: 20px;
    }
    
    .order-item {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .order-item:last-child {
      border-bottom: none;
    }
    
    .item-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 10px;
    }
    
    .item-details {
      flex: 1;
    }
    
    .item-name {
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .item-price {
      color: #e53935;
      font-weight: 600;
    }
    
    .item-quantity {
      color: #666;
      font-size: 14px;
    }
    
    .order-footer {
      background: #f8f9fa;
      padding: 20px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #eee;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .order-total {
      font-size: 20px;
      font-weight: bold;
    }
    
    .order-total span {
      color: #e53935;
      margin-left: 10px;
    }
    
    .order-actions {
      display: flex;
      gap: 15px;
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .btn-outline:hover {
      background: #e53935;
      color: white;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .empty-orders {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .empty-orders h2 {
      margin: 20px 0;
    }
    
    .empty-orders p {
      color: #666;
      margin-bottom: 30px;
    }
    
    @media (max-width: 768px) {
      .order-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .order-footer {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .order-actions {
        width: 100%;
        flex-direction: column;
      }
      
      .order-item {
        flex-direction: column;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="orders-container">
    <div class="orders-header">
      <h1>My Orders</h1>
      <p>Track and manage your orders</p>
    </div>
    
    <div class="orders-stats">
      <div class="stat-card">
        <div class="stat-number">${userOrders.length}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">₹${userOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)}</div>
        <div class="stat-label">Total Spent</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${userOrders.filter(o => o.orderStatus === 'completed').length}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${userOrders.filter(o => o.orderStatus === 'processing').length}</div>
        <div class="stat-label">Processing</div>
      </div>
    </div>
    
    ${userOrders.length === 0 ? `
    <div class="empty-orders">
      <div style="font-size: 80px;">📦</div>
      <h2>No orders yet</h2>
      <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
      <a href="/" class="btn btn-primary">Start Shopping</a>
    </div>
    ` : `
    <div class="orders-list">
      ${userOrders.map(order => `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-id">Order #${order.id}</div>
            <div class="order-date">Placed on ${order.date || new Date().toLocaleDateString()}</div>
          </div>
          <div>
            <span class="order-status status-${order.orderStatus || 'pending'}">
              ${(order.orderStatus || 'pending').toUpperCase()}
            </span>
          </div>
        </div>
        
        <div class="order-body">
          <div class="order-items">
            ${order.items && order.items.map(item => `
            <div class="order-item">
              ${item.image ? `<img src="${item.image}" class="item-image">` : `
              <div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 32px;">🏏</div>
              </div>
              `}
              <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-price">₹ ${item.price}</div>
                <div class="item-quantity">Quantity: ${item.quantity || 1}</div>
              </div>
            </div>
            `).join('')}
          </div>
        </div>
        
        <div class="order-footer">
          <div class="order-total">
            Total: <span>₹ ${order.total || 0}</span>
          </div>
          <div class="order-actions">
            <a href="/order/${order.id}" class="btn btn-outline">View Details</a>
            <a href="/track-order/${order.id}" class="btn btn-outline">Track Order</a>
          </div>
        </div>
      </div>
      `).join('')}
    </div>
    `}
  </div>

  ${getFooter()}
</body>
</html>`);
});

// ADDRESSES PAGE (User's Address Book)
app.get("/addresses", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>My Addresses | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .addresses-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .addresses-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .addresses-header h1 {
      font-size: 42px;
      margin-bottom: 10px;
    }
    
    .addresses-header p {
      color: #666;
      font-size: 18px;
    }
    
    .addresses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .address-card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .address-card.default {
      border: 2px solid #e53935;
    }
    
    .address-badge {
      position: absolute;
      top: 15px;
      right: 15px;
      background: #e53935;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .address-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      padding-right: 80px;
    }
    
    .address-details {
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    
    .address-details p {
      margin: 5px 0;
    }
    
    .address-actions {
      display: flex;
      gap: 10px;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .btn-outline:hover {
      background: #e53935;
      color: white;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    .add-address-card {
      background: #f8f9fa;
      border: 2px dashed #ddd;
      border-radius: 15px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 250px;
    }
    
    .add-address-card:hover {
      border-color: #e53935;
      background: #f0f0f0;
    }
    
    .add-address-card i {
      font-size: 48px;
      color: #999;
      margin-bottom: 20px;
    }
    
    .add-address-card h3 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .add-address-card p {
      color: #666;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal-content {
      background: white;
      padding: 40px;
      border-radius: 15px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    
    .modal-header h2 {
      margin: 0;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 30px;
      cursor: pointer;
      color: #666;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .form-input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    
    .empty-addresses {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .addresses-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="addresses-container">
    <div class="addresses-header">
      <h1>My Addresses</h1>
      <p>Manage your shipping addresses</p>
    </div>
    
    <div class="addresses-grid">
      <div class="add-address-card" onclick="showAddAddressModal()">
        <i class="fas fa-plus-circle"></i>
        <h3>Add New Address</h3>
        <p>Add a new shipping address</p>
      </div>
      
      ${user && user.address && Object.values(user.address).some(val => val) ? `
      <div class="address-card default">
        <div class="address-badge">DEFAULT</div>
        <div class="address-name">${user.name || 'Home'}</div>
        <div class="address-details">
          <p>${user.address.street || ''}</p>
          <p>${user.address.city || ''}, ${user.address.state || ''} - ${user.address.pincode || ''}</p>
          <p>${user.address.country || 'India'}</p>
          <p>Phone: ${user.phone || ''}</p>
        </div>
        <div class="address-actions">
          <button class="btn btn-outline" onclick="editAddress()">Edit</button>
          <button class="btn btn-danger" onclick="deleteAddress()">Delete</button>
        </div>
      </div>
      ` : ''}
      
      ${!user || !user.address || !Object.values(user.address).some(val => val) ? `
      <div class="empty-addresses">
        <div style="font-size: 60px; margin-bottom: 20px;">📍</div>
        <h2>No addresses saved</h2>
        <p style="color: #666; margin-bottom: 30px;">You haven't added any shipping addresses yet.</p>
        <button class="btn btn-primary" onclick="showAddAddressModal()">Add Your First Address</button>
      </div>
      ` : ''}
    </div>
  </div>

  <div id="addressModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add New Address</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      
      <form id="addressForm" method="POST" action="/add-address">
        <div class="form-group">
          <label class="form-label">Address Line 1 *</label>
          <input type="text" name="street" class="form-input" placeholder="Street address" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Address Line 2</label>
          <input type="text" name="street2" class="form-input" placeholder="Apartment, suite, unit etc.">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">City *</label>
            <input type="text" name="city" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">State *</label>
            <input type="text" name="state" class="form-input" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">PIN Code *</label>
            <input type="text" name="pincode" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Country</label>
            <input type="text" name="country" class="form-input" value="India" readonly>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Phone Number *</label>
          <input type="tel" name="phone" class="form-input" required>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" name="isDefault" checked>
            <span>Set as default address</span>
          </label>
        </div>
        
        <div style="display: flex; gap: 15px; margin-top: 30px;">
          <button type="submit" class="btn btn-primary" style="flex: 1;">Save Address</button>
          <button type="button" class="btn btn-outline" onclick="closeModal()" style="flex: 1;">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  ${getFooter()}
  
  <script>
    function showAddAddressModal() {
      document.getElementById('addressModal').style.display = 'flex';
    }
    
    function closeModal() {
      document.getElementById('addressModal').style.display = 'none';
    }
    
    function editAddress() {
      alert('Edit address functionality - In a real app, this would populate the modal with existing address data');
      showAddAddressModal();
    }
    
    function deleteAddress() {
      if (confirm('Are you sure you want to delete this address?')) {
        alert('Address deleted (simulated)');
        location.reload();
      }
    }
    
    window.onclick = function(event) {
      const modal = document.getElementById('addressModal');
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    }
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  </script>
</body>
</html>`);
});

// ADD ADDRESS PROCESSING
app.post("/add-address", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === req.session.userId);
  
  if (userIndex === -1) {
    return res.redirect("/addresses");
  }
  
  users[userIndex].address = {
    street: req.body.street,
    street2: req.body.street2 || '',
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    country: req.body.country || 'India'
  };
  
  users[userIndex].phone = req.body.phone;
  users[userIndex].updatedAt = new Date().toISOString();
  
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  res.redirect("/addresses?success=Address added successfully");
});

// TRACK ORDER PAGE
app.get("/track-order/:orderId", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const order = orders.find(o => o.id == req.params.orderId);
  
  if (!order) {
    return res.redirect("/orders?error=Order not found");
  }
  
  if (order.userId !== req.session.userId && !req.session.loggedIn) {
    return res.redirect("/orders?error=You don't have permission to view this order");
  }
  
  const statuses = ['pending', 'processing', 'shipped', 'out-for-delivery', 'delivered'];
  const currentStatusIndex = statuses.indexOf(order.orderStatus || 'pending');
  const progressPercentage = ((currentStatusIndex + 1) / statuses.length) * 100;
  
  const trackingEvents = [];
  
  if (order.date) {
    trackingEvents.push({
      date: order.date,
      status: 'Order Placed',
      description: 'Your order has been placed successfully',
      completed: true
    });
  }
  
  if (order.orderStatus === 'processing' || ['shipped', 'out-for-delivery', 'delivered'].includes(order.orderStatus)) {
    trackingEvents.push({
      date: order.updatedAt || order.date,
      status: 'Order Processing',
      description: 'Your order is being processed',
      completed: true
    });
  }
  
  if (order.orderStatus === 'shipped' || ['out-for-delivery', 'delivered'].includes(order.orderStatus)) {
    trackingEvents.push({
      date: order.shippedDate || order.updatedAt || order.date,
      status: 'Shipped',
      description: 'Your order has been shipped',
      completed: true
    });
  }
  
  if (order.orderStatus === 'out-for-delivery' || order.orderStatus === 'delivered') {
    trackingEvents.push({
      date: order.outForDeliveryDate || order.updatedAt || order.date,
      status: 'Out for Delivery',
      description: 'Your order is out for delivery',
      completed: true
    });
  }
  
  if (order.orderStatus === 'delivered') {
    trackingEvents.push({
      date: order.deliveredDate || order.updatedAt || order.date,
      status: 'Delivered',
      description: 'Your order has been delivered',
      completed: true
    });
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Track Order #${order.id} | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .track-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .track-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .track-header h1 {
      font-size: 42px;
      margin-bottom: 10px;
    }
    
    .track-header p {
      color: #666;
      font-size: 18px;
    }
    
    .order-info-card {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .order-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .info-item {
      text-align: center;
    }
    
    .info-label {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 20px;
      font-weight: 600;
      color: #111;
    }
    
    .info-value.highlight {
      color: #e53935;
    }
    
    .progress-container {
      background: white;
      border-radius: 15px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .progress-bar-container {
      height: 10px;
      background: #e9ecef;
      border-radius: 10px;
      margin-bottom: 40px;
      position: relative;
    }
    
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #e53935, #ff6b6b);
      border-radius: 10px;
      width: ${progressPercentage}%;
      transition: width 0.5s ease;
    }
    
    .progress-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
      margin-top: -25px;
    }
    
    .progress-step {
      text-align: center;
      flex: 1;
    }
    
    .step-dot {
      width: 20px;
      height: 20px;
      background: #e9ecef;
      border: 3px solid #fff;
      border-radius: 50%;
      margin: 0 auto 10px;
      position: relative;
      z-index: 2;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .step-dot.completed {
      background: #e53935;
    }
    
    .step-dot.active {
      background: #e53935;
      box-shadow: 0 0 0 3px rgba(229,57,53,0.3);
    }
    
    .step-label {
      font-size: 14px;
      font-weight: 600;
      color: #111;
    }
    
    .step-date {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    
    .timeline-container {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .timeline-title {
      font-size: 20px;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .timeline {
      position: relative;
      padding-left: 30px;
    }
    
    .timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e9ecef;
    }
    
    .timeline-event {
      position: relative;
      padding-bottom: 30px;
    }
    
    .timeline-event:last-child {
      padding-bottom: 0;
    }
    
    .timeline-dot {
      position: absolute;
      left: -30px;
      top: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 2px solid #e53935;
    }
    
    .timeline-dot.completed {
      background: #e53935;
    }
    
    .timeline-content {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
    }
    
    .timeline-status {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 5px;
      color: #111;
    }
    
    .timeline-description {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .timeline-date {
      color: #999;
      font-size: 12px;
    }
    
    .order-details {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .order-items {
      margin-top: 20px;
    }
    
    .order-item {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .order-item:last-child {
      border-bottom: none;
    }
    
    .item-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 10px;
    }
    
    .item-details {
      flex: 1;
    }
    
    .item-name {
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .item-price {
      color: #e53935;
      font-weight: 600;
    }
    
    .item-quantity {
      color: #666;
      font-size: 14px;
    }
    
    .shipping-info {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
       
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .action-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin: 40px 0;
    }
    
    .btn {
      padding: 15px 30px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-primary:hover {
      background: #c62828;
      transform: translateY(-2px);
    }
    
    .btn-outline {
      background: white;
      color: #e53935;
      border: 2px solid #e53935;
    }
    
    .btn-outline:hover {
      background: #e53935;
      color: white;
    }
    
    .estimated-delivery {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      margin-top: 20px;
    }
    
    @media (max-width: 768px) {
      .progress-steps {
        flex-direction: column;
        gap: 20px;
        margin-top: 20px;
      }
      
      .progress-step {
        display: flex;
        align-items: center;
        gap: 15px;
        text-align: left;
      }
      
      .step-dot {
        margin: 0;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .order-item {
        flex-direction: column;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="track-container">
    <div class="track-header">
      <h1>Track Your Order</h1>
      <p>Order #${order.id}</p>
    </div>
    
    <div class="order-info-card">
      <div class="order-info-grid">
        <div class="info-item">
          <div class="info-label">Order Date</div>
          <div class="info-value">${order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Estimated Delivery</div>
          <div class="info-value highlight">${order.estimatedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Order Status</div>
          <div class="info-value" style="color: ${order.orderStatus === 'delivered' ? '#28a745' : order.orderStatus === 'cancelled' ? '#dc3545' : '#e53935'}">
            ${(order.orderStatus || 'pending').toUpperCase()}
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Payment Status</div>
          <div class="info-value" style="color: ${order.paymentStatus === 'completed' ? '#28a745' : '#ffc107'}">
            ${(order.paymentStatus || 'pending').toUpperCase()}
          </div>
        </div>
      </div>
    </div>
    
    <div class="progress-container">
      <h2 style="margin-top: 0; margin-bottom: 30px; text-align: center;">Order Progress</h2>
      
      <div class="progress-bar-container">
        <div class="progress-bar-fill"></div>
      </div>
      
      <div class="progress-steps">
        <div class="progress-step">
          <div class="step-dot ${currentStatusIndex >= 0 ? 'completed' : ''}"></div>
          <div class="step-label">Pending</div>
          <div class="step-date">${order.date ? new Date(order.date).toLocaleDateString() : ''}</div>
        </div>
        <div class="progress-step">
          <div class="step-dot ${currentStatusIndex >= 1 ? 'completed' : ''}"></div>
          <div class="step-label">Processing</div>
          <div class="step-date">${order.orderStatus === 'processing' || currentStatusIndex >= 1 ? (order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : '') : ''}</div>
        </div>
        <div class="progress-step">
          <div class="step-dot ${currentStatusIndex >= 2 ? 'completed' : ''}"></div>
          <div class="step-label">Shipped</div>
          <div class="step-date">${order.orderStatus === 'shipped' || currentStatusIndex >= 2 ? (order.shippedDate ? new Date(order.shippedDate).toLocaleDateString() : '') : ''}</div>
        </div>
        <div class="progress-step">
          <div class="step-dot ${currentStatusIndex >= 3 ? 'completed' : ''}"></div>
          <div class="step-label">Out for Delivery</div>
          <div class="step-date">${order.orderStatus === 'out-for-delivery' || currentStatusIndex >= 3 ? (order.outForDeliveryDate ? new Date(order.outForDeliveryDate).toLocaleDateString() : '') : ''}</div>
        </div>
        <div class="progress-step">
          <div class="step-dot ${currentStatusIndex >= 4 ? 'completed' : ''}"></div>
          <div class="step-label">Delivered</div>
          <div class="step-date">${order.orderStatus === 'delivered' ? (order.deliveredDate ? new Date(order.deliveredDate).toLocaleDateString() : '') : ''}</div>
        </div>
      </div>
    </div>
    
    <div class="timeline-container">
      <h2 class="timeline-title">
        <i class="fas fa-history"></i> Tracking History
      </h2>
      
    <div class="timeline">
    <!-- Order Placed - Always show -->
    <div class="timeline-event">
        <div class="timeline-dot completed"></div>
        <div class="timeline-content">
            <div class="timeline-status">📦 Order Placed</div>
            <div class="timeline-description">Your order has been placed successfully</div>
            <div class="timeline-date">${order.date ? new Date(order.date).toLocaleString() : new Date(order.id).toLocaleString()}</div>
        </div>
    </div>
    
    <!-- Order Processing -->
    ${order.orderStatus === 'processing' || order.orderStatus === 'shipped' || order.orderStatus === 'out-for-delivery' || order.orderStatus === 'delivered' ? `
    <div class="timeline-event">
        <div class="timeline-dot completed"></div>
        <div class="timeline-content">
            <div class="timeline-status">⚙️ Order Processing</div>
            <div class="timeline-description">Your order is being processed at our warehouse</div>
            <div class="timeline-date">${order.updatedAt ? new Date(order.updatedAt).toLocaleString() : new Date(order.id + 3600000).toLocaleString()}</div>
        </div>
    </div>
    ` : order.orderStatus !== 'pending' && order.orderStatus !== 'cancelled' ? `
    <div class="timeline-event">
        <div class="timeline-dot"></div>
        <div class="timeline-content" style="opacity: 0.6;">
            <div class="timeline-status">⚙️ Order Processing</div>
            <div class="timeline-description">Pending</div>
        </div>
    </div>
    ` : ''}
    
    <!-- Shipped - Show tracking details if available -->
    ${order.orderStatus === 'shipped' || order.orderStatus === 'out-for-delivery' || order.orderStatus === 'delivered' ? `
    <div class="timeline-event">
        <div class="timeline-dot completed"></div>
        <div class="timeline-content">
            <div class="timeline-status">🚚 Shipped</div>
            <div class="timeline-description">
                Your order has been shipped
                ${order.courierName ? ` via <strong>${order.courierName}</strong>` : ''}
                ${order.trackingNumber ? ` (Tracking: <strong>${order.trackingNumber}</strong>)` : ''}
            </div>
            <div class="timeline-date">${order.shippingDate ? new Date(order.shippingDate).toLocaleString() : (order.updatedAt ? new Date(order.updatedAt).toLocaleString() : new Date(order.id + 7200000).toLocaleString())}</div>
            ${order.trackingUrl ? `
            <div style="margin-top: 10px;">
                <a href="${order.trackingUrl}" target="_blank" style="color: #2196f3; text-decoration: none; font-size: 13px;">
                    <i class="fas fa-external-link-alt"></i> Track Package
                </a>
            </div>
            ` : ''}
        </div>
    </div>
    ` : order.orderStatus !== 'pending' && order.orderStatus !== 'processing' && order.orderStatus !== 'cancelled' ? `
    <div class="timeline-event">
        <div class="timeline-dot"></div>
        <div class="timeline-content" style="opacity: 0.6;">
            <div class="timeline-status">🚚 Shipped</div>
            <div class="timeline-description">Not yet shipped</div>
        </div>
    </div>
    ` : ''}
    
    <!-- Out for Delivery -->
    ${order.orderStatus === 'out-for-delivery' || order.orderStatus === 'delivered' ? `
    <div class="timeline-event">
        <div class="timeline-dot completed"></div>
        <div class="timeline-content">
            <div class="timeline-status">🚚 Out for Delivery</div>
            <div class="timeline-description">Your order is out for delivery</div>
            <div class="timeline-date">${order.outForDeliveryDate ? new Date(order.outForDeliveryDate).toLocaleString() : (order.updatedAt ? new Date(order.updatedAt).toLocaleString() : new Date(order.id + 10800000).toLocaleString())}</div>
        </div>
    </div>
    ` : order.orderStatus !== 'pending' && order.orderStatus !== 'processing' && order.orderStatus !== 'shipped' && order.orderStatus !== 'cancelled' ? `
    <div class="timeline-event">
        <div class="timeline-dot"></div>
        <div class="timeline-content" style="opacity: 0.6;">
            <div class="timeline-status">🚚 Out for Delivery</div>
            <div class="timeline-description">Pending</div>
        </div>
    </div>
    ` : ''}
    
    <!-- Delivered -->
    ${order.orderStatus === 'delivered' ? `
    <div class="timeline-event">
        <div class="timeline-dot completed" style="background: #28a745;"></div>
        <div class="timeline-content" style="background: #d4edda;">
            <div class="timeline-status" style="color: #28a745;">✅ Delivered</div>
            <div class="timeline-description">Your order has been delivered successfully</div>
            <div class="timeline-date">${order.deliveredDate ? new Date(order.deliveredDate).toLocaleString() : (order.updatedAt ? new Date(order.updatedAt).toLocaleString() : new Date(order.id + 14400000).toLocaleString())}</div>
        </div>
    </div>
    ` : order.orderStatus === 'cancelled' ? `
    <div class="timeline-event">
        <div class="timeline-dot" style="background: #dc3545;"></div>
        <div class="timeline-content" style="background: #f8d7da;">
            <div class="timeline-status" style="color: #dc3545;">❌ Cancelled</div>
            <div class="timeline-description">Your order has been cancelled</div>
            <div class="timeline-date">${order.updatedAt ? new Date(order.updatedAt).toLocaleString() : new Date().toLocaleString()}</div>
        </div>
    </div>
    ` : ''}
    
    <!-- Tracking Updates from courier (if any) -->
    ${order.trackingUpdates && order.trackingUpdates.length > 0 ? order.trackingUpdates.map(update => `
    <div class="timeline-event">
        <div class="timeline-dot completed" style="background: #ffc107;"></div>
        <div class="timeline-content" style="background: #fff3cd;">
            <div class="timeline-status">📋 ${update.status || 'Update'}</div>
            <div class="timeline-description">${update.description || ''} ${update.location ? ` at ${update.location}` : ''}</div>
            <div class="timeline-date">${new Date(update.date).toLocaleString()}</div>
        </div>
    </div>
    `).join('') : ''}
</div>
    
    <div class="order-details">
      <h2 style="margin-top: 0; margin-bottom: 20px;">Order Items</h2>
      
      <div class="order-items">
        ${order.items && order.items.map(item => `
        <div class="order-item">
          ${item.image ? `<img src="${item.image}" class="item-image">` : `
          <div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
            <div style="font-size: 32px;">🏏</div>
          </div>
          `}
          <div class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-price">₹ ${item.price}</div>
            <div class="item-quantity">Quantity: ${item.quantity || 1}</div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    
    <div class="shipping-info">
      <h2 style="margin-top: 0; margin-bottom: 20px;">Shipping Information</h2>
      
      <div class="info-grid">
        <div>
          <h3 style="margin-top: 0;">Delivery Address</h3>
          <p>
            ${order.customerName || ''}<br>
            ${order.address?.street || ''}<br>
            ${order.address?.city || ''}, ${order.address?.state || ''} - ${order.address?.pincode || ''}<br>
            ${order.address?.country || 'India'}<br>
            Phone: ${order.phone || ''}
          </p>
        </div>
        
        <div>
          <h3 style="margin-top: 0;">Delivery Method</h3>
          <p>
            <strong>Standard Shipping</strong><br>
            Estimated Delivery: ${order.estimatedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br>
            Shipping Charge: ₹ ${order.shipping || 0}
          </p>
        </div>
        
        <div>
          <h3 style="margin-top: 0;">Payment Method</h3>
          <p>
            ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
              order.paymentMethod === 'card' ? 'Credit/Debit Card' :
              order.paymentMethod === 'upi' ? 'UPI' : 
              order.paymentMethod === 'netbanking' ? 'Net Banking' : 'N/A'}<br>
            Payment Status: <span style="color: ${order.paymentStatus === 'completed' ? '#28a745' : '#ffc107'}; font-weight: 600;">${(order.paymentStatus || 'pending').toUpperCase()}</span>
          </p>
        </div>
      </div>
    </div>
    
    <div class="action-buttons">
      <a href="/order/${order.id}" class="btn btn-primary">
        <i class="fas fa-receipt"></i> View Order Details
      </a>
      <a href="/orders" class="btn btn-outline">
        <i class="fas fa-list"></i> Back to Orders
      </a>
      ${order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' ? `
      <button class="btn btn-outline" onclick="getUpdates('${order.id}')">
        <i class="fas fa-bell"></i> Get Updates
      </button>
      ` : ''}
    </div>
    
    ${order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' ? `
    <div class="estimated-delivery">
      <h3 style="margin-top: 0; color: white;">📦 Expected Delivery</h3>
      <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${order.estimatedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
      <p style="opacity: 0.9;">We'll notify you when your order is out for delivery</p>
    </div>
    ` : ''}
  </div>
            <!-- YAHAN PE NAYA CODE ADD KARNA HAI -->
            ${order.courierName && order.trackingNumber ? `
            <div class="courier-details" style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #2196f3;">
                <h3 style="margin-top: 0; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; color: #0c5460;">
                    <i class="fas fa-truck" style="color: #2196f3;"></i> Tracking Information
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <div style="color: #666; font-size: 13px; margin-bottom: 5px;">Courier Partner</div>
                        <div style="font-weight: 600; font-size: 16px; color: #333;">${order.courierName}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 13px; margin-bottom: 5px;">Tracking Number</div>
                        <div style="font-weight: 600; font-size: 16px; color: #333;">${order.trackingNumber}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 13px; margin-bottom: 5px;">Estimated Delivery</div>
                        <div style="font-weight: 600; font-size: 16px; color: #28a745;">${order.estimatedDelivery || 'N/A'}</div>
                    </div>
                </div>
                ${order.trackingUrl ? `
                <div style="margin-top: 15px; text-align: center;">
                    <a href="${order.trackingUrl}" target="_blank" style="display: inline-block; padding: 12px 25px; background: #2196f3; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        <i class="fas fa-external-link-alt"></i> Track on ${order.courierName} Website
                    </a>
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <!-- Action Buttons -->
            <div class="action-buttons">...</div>
        </div>

  ${getFooter()}
  
  <script>
    function getUpdates(orderId) {
      alert('You will receive SMS and email updates for this order. (Demo feature)');
    }
  </script>
</body>
</html>`);
});

// ADMIN PRODUCTS PAGE
app.get("/admin/products", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const posts = loadPosts();
  const categories = getCategories(posts);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Products Management | Sports India Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        
        .products-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .btn { padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; text-decoration: none; }
        .btn-primary { background: #e53935; color: white; }
    </style>
</head>
<body>
    ${getAdminHeader(req)}
    
    <div class="products-container">
        <div class="page-header">
            <h1><i class="fas fa-box"></i> Products Management</h1>
            <a href="/add-product" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Product
            </a>
        </div>
        
        <p>Redirecting to products page...</p>
        <script>window.location.href = "/posts";</script>
    </div>
    
    ${getAdminFooter()}
</body>
</html>`);
});

// ADMIN ORDERS PAGE - COMPLETE WORKING VERSION
app.get("/admin/orders", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  // Load orders from file
  let orders = [];
  try {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  } catch (e) {
    console.error("Error loading orders:", e);
    orders = [];
  }
  
  // Sort orders by date (newest first)
  const sortedOrders = [...orders].sort((a, b) => {
    return new Date(b.date || b.id || 0) - new Date(a.date || a.id || 0);
  });
  
  // Filter by status if provided
  const statusFilter = req.query.status;
  let filteredOrders = sortedOrders;
  if (statusFilter && statusFilter !== 'all') {
    filteredOrders = sortedOrders.filter(o => o.orderStatus === statusFilter);
  }
  
  // Search by order ID or customer name
  const searchQuery = req.query.search?.toLowerCase() || '';
  if (searchQuery) {
    filteredOrders = filteredOrders.filter(o => 
      o.id.toString().includes(searchQuery) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery)) ||
      (o.email && o.email.toLowerCase().includes(searchQuery))
    );
  }
 
  
  // Calculate statistics
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
  const processingOrders = orders.filter(o => o.orderStatus === 'processing').length;
  const completedOrders = orders.filter(o => o.orderStatus === 'completed').length;
  const cancelledOrders = orders.filter(o => o.orderStatus === 'cancelled').length;
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Orders Management | Sports India Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        
        .orders-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            background: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .page-header h1 {
            margin: 0;
            font-size: 32px;
            color: #111;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            text-align: center;
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #e53935;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
        }
        
        .filter-bar {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .search-box {
            flex: 1;
            min-width: 300px;
            display: flex;
            gap: 10px;
        }
        
        .search-input {
            flex: 1;
            padding: 12px 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
        }
        
        .filter-select {
            padding: 12px 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            min-width: 150px;
        }
        
        .btn {
            padding: 12px 24px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: #e53935;
            color: white;
        }
        
        .btn-primary:hover {
            background: #c62828;
            transform: translateY(-2px);
        }
        
        .btn-outline {
            background: white;
            color: #e53935;
            border: 2px solid #e53935;
        }
        
        .btn-outline:hover {
            background: #e53935;
            color: white;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }
        
        .orders-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .orders-table th {
            background: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #212529;
            border-bottom: 2px solid #dee2e6;
        }
        
        .orders-table td {
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            vertical-align: middle;
        }
        
        .orders-table tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            display: inline-block;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-processing {
            background: #cce5ff;
            color: #004085;
        }
        
        .status-completed {
            background: #d4edda;
            color: #155724;
        }
        
        .status-cancelled {
            background: #f8d7da;
            color: #721c24;
        }
        
        .action-buttons {
            display: flex;
            gap: 5px;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 30px;
        }
        
        .page-btn {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-weight: 600;
        }
        
        .page-btn.active {
            background: #e53935;
            color: white;
            border-color: #e53935;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .customer-info {
            display: flex;
            flex-direction: column;
        }
        
        .customer-name {
            font-weight: 600;
            margin-bottom: 3px;
        }
        
        .customer-email {
            font-size: 12px;
            color: #666;
        }
        
        @media (max-width: 1024px) {
            .filter-bar {
                flex-direction: column;
                align-items: stretch;
            }
            
            .search-box {
                min-width: auto;
            }
            
            .orders-table {
                display: block;
                overflow-x: auto;
            }
        }
        
        @media (max-width: 768px) {
            .page-header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .action-buttons {
                flex-direction: column;
            }
        }
        
        @media (max-width: 576px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <!-- Tracking Modal -->
<div id="trackingModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
    <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0;"><i class="fas fa-truck"></i> Add Tracking Details</h2>
            <button onclick="closeTrackingModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <form id="trackingForm" onsubmit="saveTracking(event)">
            <input type="hidden" id="trackingOrderId" name="orderId">
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Order Status</label>
                <select id="orderStatus" name="orderStatus" class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;" onchange="toggleTrackingFields()">
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="out-for-delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            
            <div id="trackingFields" style="display: none;">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Courier/Shipping Partner</label>
                    <select id="courierName" name="courierName" class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                        <option value="">Select Courier</option>
                        <option value="Delhivery">Delhivery</option>
                        <option value="Blue Dart">Blue Dart</option>
                        <option value="DTDC">DTDC</option>
                        <option value="FedEx">FedEx</option>
                        <option value="India Post">India Post</option>
                        <option value="Amazon Shipping">Amazon Shipping</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tracking Number</label>
                    <input type="text" id="trackingNumber" name="trackingNumber" class="form-input" placeholder="Enter tracking number" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                </div>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tracking URL (Optional)</label>
                    <input type="url" id="trackingUrl" name="trackingUrl" class="form-input" placeholder="https://..." style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                </div>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Estimated Delivery Date</label>
                    <input type="date" id="estimatedDelivery" name="estimatedDelivery" class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Add Tracking Update</label>
                <textarea id="trackingUpdate" name="trackingUpdate" rows="3" class="form-input" placeholder="e.g., Order has been shipped from Mumbai warehouse" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;"></textarea>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Current Location (Optional)</label>
                <input type="text" id="currentLocation" name="currentLocation" class="form-input" placeholder="e.g., Mumbai Sorting Center" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary" style="flex: 2; background: #e53935; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Save Tracking</button>
                <button type="button" onclick="closeTrackingModal()" class="btn btn-outline" style="flex: 1; background: white; color: #666; border: 2px solid #ddd; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
            </div>
        </form>
    </div>
</div>

<style>
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.btn-info {
    background: #17a2b8;
    color: white;
}

.btn-info:hover {
    background: #138496;
}
</style>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    ${getAdminHeader(req)}
    
    <div class="orders-container">
        <div class="page-header">
            <div>
                <h1 style="margin: 0; font-size: 32px; color: #111;">
                    <i class="fas fa-shopping-cart"></i> Orders Management
                </h1>
                <p style="color: #666; margin-top: 5px;">Total Orders: ${orders.length}</p>
            </div>
            
            <div style="display: flex; gap: 15px;">
                <button onclick="exportOrders('csv')" class="btn btn-outline">
                    <i class="fas fa-file-csv"></i> Export CSV
                </button>
                <button onclick="exportOrders('pdf')" class="btn btn-outline">
                    <i class="fas fa-file-pdf"></i> Export PDF
                </button>
            </div>
        </div>
        
        <!-- Statistics Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">₹${totalRevenue.toLocaleString()}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${orders.length}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${pendingOrders}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${processingOrders}</div>
                <div class="stat-label">Processing</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${completedOrders}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${cancelledOrders}</div>
                <div class="stat-label">Cancelled</div>
            </div>
        </div>
        
        <!-- Filter Bar -->
        <div class="filter-bar">
            <div class="search-box">
                <input type="text" class="search-input" id="searchInput" placeholder="Search by Order ID, Customer Name, or Email..." value="${searchQuery}">
                <button class="btn btn-primary" onclick="searchOrders()">
                    <i class="fas fa-search"></i> Search
                </button>
            </div>
            
            <select class="filter-select" id="statusFilter" onchange="filterByStatus()">
                <option value="all" ${!statusFilter || statusFilter === 'all' ? 'selected' : ''}>All Orders</option>
                <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${statusFilter === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${statusFilter === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            
            <button class="btn btn-outline" onclick="resetFilters()">
                <i class="fas fa-redo"></i> Reset
            </button>
        </div>
        
        <!-- Orders Table -->
        ${filteredOrders.length === 0 ? `
        <div class="empty-state">
            <div style="font-size: 60px; margin-bottom: 20px; color: #ddd;">
                <i class="fas fa-shopping-cart"></i>
            </div>
            <h2 style="margin-bottom: 15px;">No Orders Found</h2>
            <p style="color: #666; margin-bottom: 20px;">
                ${searchQuery || (statusFilter && statusFilter !== 'all') ? 
                  'Try adjusting your search or filter criteria.' : 
                  'No orders have been placed yet.'}
            </p>
            ${searchQuery || (statusFilter && statusFilter !== 'all') ? 
              `<button class="btn btn-primary" onclick="resetFilters()">Clear Filters</button>` : 
              ''}
        </div>
        ` : `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
   ${filteredOrders.map(order => {
    // Format date properly
    let orderDate = 'N/A';
    let orderTime = '';
    
    if (order.date) {
        try {
            const date = new Date(order.date);
            if (!isNaN(date.getTime())) {
                orderDate = date.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                orderTime = date.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.error("Date parsing error:", e);
        }
    } else if (order.id) {
        // If no date but has ID, use ID as timestamp
        try {
            const idNum = parseInt(order.id.toString().replace(/\D/g, ''));
            if (!isNaN(idNum)) {
                const date = new Date(idNum);
                if (!isNaN(date.getTime())) {
                    orderDate = date.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    orderTime = date.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
        } catch (e) {
            console.error("ID parsing error:", e);
        }
    }
    
    // Format order ID
    const orderIdStr = order.id ? order.id.toString() : '';
    const displayOrderId = orderIdStr ? 
        '#' + (orderIdStr.length > 8 ? orderIdStr.slice(-8) : orderIdStr) : 
        '#N/A';
    
    // Calculate item count
    const itemCount = order.items ? 
        order.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0) : 0;
    
    // Format total with Indian Rupee symbol
    const totalAmount = parseFloat(order.total || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return `
    <tr>
        <td style="font-weight: 600;" title="Full ID: ${order.id}">
            ${displayOrderId}
        </td>
        <td>
            <div>${orderDate}</div>
            ${orderTime ? `<small style="color: #666;">${orderTime}</small>` : ''}
        </td>
        <td>
            <div class="customer-info">
                <span class="customer-name">${order.customerName || 'Guest'}</span>
                <span class="customer-email">${order.email || ''}</span>
                <span class="customer-email">${order.phone || ''}</span>
            </div>
        </td>
        <td>
            <div style="font-weight: 600;">${itemCount} items</div>
            <small style="color: #666;">${order.items ? order.items.length : 0} products</small>
        </td>
        <td style="font-weight: 600; color: #e53935; font-size: 18px;">
            ₹${totalAmount}
        </td>
        <td>
            <span class="status-badge ${order.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}">
                ${order.paymentMethod === 'cod' ? 'COD' : 
                  order.paymentMethod === 'card' ? 'Card' :
                  order.paymentMethod === 'upi' ? 'UPI' : 
                  order.paymentMethod === 'netbanking' ? 'NetBank' : order.paymentMethod || 'N/A'}
            </span>
            <br>
            <small style="color: #666;">${order.paymentStatus || 'pending'}</small>
        </td>
        <td>
            <select class="status-badge" onchange="updateOrderStatus('${order.id}', this.value)" 
                    style="padding: 5px; border-radius: 20px; border: 2px solid #ddd; background: white;">
                <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="completed" ${order.orderStatus === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
        </td>
        <td>
       <td>
    <div class="action-buttons">
        <a href="/order/${order.id}" class="btn btn-sm btn-primary" title="View Order">
            <i class="fas fa-eye"></i>
        </a>
        <button onclick="printOrder('${order.id}')" class="btn btn-sm btn-outline" title="Print Invoice">
            <i class="fas fa-print"></i>
        </button>
        <button onclick="sendOrderEmail('${order.id}')" class="btn btn-sm btn-outline" title="Email Customer">
            <i class="fas fa-envelope"></i>
        </button>
        <!-- YAHAN PE TRACKING BUTTON ADD KAREN -->
       <button onclick="showTrackingModal('${order.id}')" class="btn btn-sm btn-info" style="background:#17a2b8; color:white; border:none;" title="Add Tracking">
    <i class="fas fa-truck"></i>
</button>
    </div>
</td>
    </tr>
    `;
}).join('')}
            </tbody>
        </table>
        
        ${filteredOrders.length > 20 ? `
        <div class="pagination">
            <button class="page-btn">←</button>
            <button class="page-btn active">1</button>
            <button class="page-btn">2</button>
            <button class="page-btn">3</button>
            <button class="page-btn">...</button>
            <button class="page-btn">→</button>
        </div>
        ` : ''}
        `}
    </div>
    
    ${getAdminFooter()}
    
    <script>
        function searchOrders() {
            const searchTerm = document.getElementById('searchInput').value;
            const status = document.getElementById('statusFilter').value;
            window.location.href = '/admin/orders?search=' + encodeURIComponent(searchTerm) + '&status=' + status;
        }
        
        function filterByStatus() {
            const status = document.getElementById('statusFilter').value;
            const searchTerm = document.getElementById('searchInput').value;
            window.location.href = '/admin/orders?status=' + status + '&search=' + encodeURIComponent(searchTerm);
        }
        
        function resetFilters() {
            window.location.href = '/admin/orders';
        }
        
        function updateOrderStatus(orderId, status) {
            if (confirm('Are you sure you want to update this order status to ' + status + '?')) {
                fetch('/admin/update-order-status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ orderId, status })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Order status updated successfully!');
                        location.reload();
                    } else {
                        alert('Error updating order status');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Network error - please try again');
                });
            }
        }
        
        function printOrder(orderId) {
            window.open('/order/' + orderId + '?print=true', '_blank');
        }
        
        function sendOrderEmail(orderId) {
            alert('Email functionality would be implemented here. In a real app, this would send order details to the customer.');
        }
        
        function exportOrders(format) {
            alert('Exporting orders as ' + format.toUpperCase() + '... This would download a file in a real application.');
        }
        
        // Enter key to search
        document.getElementById('searchInput').addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchOrders();
            }
        });
    </script>
    <script>
// ... aapke existing functions ...

// TRACKING FUNCTIONS - YE ADD KAREIN
let currentOrderId = null;

function showTrackingModal(orderId) {
    currentOrderId = orderId;
    document.getElementById('trackingOrderId').value = orderId;
    
    // Fetch existing tracking data
    fetch('/admin/get-tracking/' + orderId)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('orderStatus').value = data.orderStatus || 'pending';
                document.getElementById('courierName').value = data.courierName || '';
                document.getElementById('trackingNumber').value = data.trackingNumber || '';
                document.getElementById('trackingUrl').value = data.trackingUrl || '';
                
                if (data.estimatedDelivery) {
                    document.getElementById('estimatedDelivery').value = data.estimatedDelivery.split('T')[0];
                }
                
                toggleTrackingFields();
            }
        })
        .catch(error => console.error('Error:', error));
    
    document.getElementById('trackingModal').style.display = 'flex';
}

function closeTrackingModal() {
    document.getElementById('trackingModal').style.display = 'none';
}

function toggleTrackingFields() {
    const status = document.getElementById('orderStatus').value;
    const trackingFields = document.getElementById('trackingFields');
    
    if (status === 'shipped' || status === 'out-for-delivery' || status === 'delivered') {
        trackingFields.style.display = 'block';
    } else {
        trackingFields.style.display = 'none';
    }
}

function saveTracking(event) {
    event.preventDefault();
    
    const formData = {
        orderId: document.getElementById('trackingOrderId').value,
        orderStatus: document.getElementById('orderStatus').value,
        courierName: document.getElementById('courierName').value,
        trackingNumber: document.getElementById('trackingNumber').value,
        trackingUrl: document.getElementById('trackingUrl').value,
        estimatedDelivery: document.getElementById('estimatedDelivery').value,
        trackingUpdate: document.getElementById('trackingUpdate').value,
        currentLocation: document.getElementById('currentLocation').value
    };
    
    fetch('/admin/update-tracking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Tracking details updated successfully!');
            closeTrackingModal();
            location.reload();
        } else {
            alert('Error updating tracking: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Network error - please try again');
    });
}

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTrackingModal();
    }
});

// Close modal on background click
document.getElementById('trackingModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeTrackingModal();
    }
});
</script>
</body>
</html>`);
});

// ADMIN SLIDERS PAGE
app.get("/admin/sliders", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const sliders = loadSliders();
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Sliders Management | Sports India Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        
        .sliders-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .btn { padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; text-decoration: none; }
        .btn-primary { background: #e53935; color: white; }
    </style>
</head>
<body>
    ${getAdminHeader(req)}
    
    <div class="sliders-container">
        <div class="page-header">
            <h1><i class="fas fa-images"></i> Sliders Management</h1>
            <a href="/admin/add-slider" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Slider
            </a>
        </div>
        
        <p>Total Sliders: ${sliders.length}</p>
        <a href="/admin/sliders?simple=1">View Sliders</a>
    </div>
    
    ${getAdminFooter()}
</body>
</html>`);
});

// ADMIN SETTINGS PAGE
app.get("/admin/settings", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Settings | Sports India Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        
        .settings-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .btn { padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; text-decoration: none; }
        .btn-primary { background: #e53935; color: white; }
    </style>
</head>
<body>
    ${getAdminHeader(req)}
    
    <div class="settings-container">
        <div class="page-header">
            <h1><i class="fas fa-cog"></i> Settings</h1>
            <p>Store configuration</p>
        </div>
        
        <p>Settings management interface - In a full implementation, this would contain all store settings.</p>
    </div>
    
    ${getAdminFooter()}
</body>
</html>`);
});

// NEWSLETTER SUBSCRIPTION
app.post("/subscribe-newsletter", (req, res) => {
  const subscribers = JSON.parse(fs.readFileSync(NEWSLETTER_FILE, "utf8"));
  const { email } = req.body;
  
  if (subscribers.some(s => s.email === email)) {
    return res.json({ success: false, message: "Already subscribed" });
  }
  
  subscribers.push({
    email,
    date: new Date().toISOString(),
    active: true,
    source: "website"
  });
  
  fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(subscribers, null, 2));
  
  res.json({ success: true, message: "Successfully subscribed!" });
});

// WISHLIST FUNCTIONALITY
app.post("/add-to-wishlist/:slug", (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: "Please login to add to wishlist" });
  }
  
  const products = loadPosts();
  const product = products.find(p => p.slug === req.params.slug);
  
  if (!product) {
    return res.json({ success: false, message: "Product not found" });
  }
  
  const wishlists = loadWishlist();
  const userWishlist = wishlists.find(w => w.userId === req.session.userId);
  
  if (userWishlist) {
    if (userWishlist.items.some(item => item.slug === req.params.slug)) {
      return res.json({ success: false, message: "Already in wishlist" });
    }
    
    userWishlist.items.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      addedAt: new Date().toISOString()
    });
  } else {
    wishlists.push({
      userId: req.session.userId,
      items: [{
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        addedAt: new Date().toISOString()
      }]
    });
  }
  
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify(wishlists, null, 2));
  
  res.json({ success: true, message: "Added to wishlist" });
});

app.get("/wishlist", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  const wishlists = loadWishlist();
  const userWishlist = wishlists.find(w => w.userId === req.session.userId);
  const products = loadPosts();
  
  const wishlistItems = userWishlist ? userWishlist.items.map(item => {
    const product = products.find(p => p.slug === item.slug);
    return { ...item, product: product || null };
  }) : [];
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>My Wishlist | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .wishlist-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .wishlist-header {
      text-align: center;
      margin: 50px 0;
    }
    
    .wishlist-content {
      min-height: 400px;
    }
    
    .empty-wishlist {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .wishlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .wishlist-item {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: transform 0.3s;
      position: relative;
    }
    
    .wishlist-item:hover {
      transform: translateY(-5px);
    }
    
    .item-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .item-details {
      padding: 20px;
    }
    
    .item-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    
    .remove-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 40px;
      height: 40px;
      background: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .move-to-cart-btn {
      flex: 1;
      background: #e53935;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    
    .view-btn {
      flex: 1;
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
    }
    
    .wishlist-stats {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .stat-item {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    
    .stat-number {
      font-size: 36px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 10px;
    }
    
    .share-wishlist {
      text-align: center;
      margin: 40px 0;
      padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      color: white;
    }
    
    .share-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 20px;
    }
    
    .share-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: white;
      color: #333;
      border: none;
      cursor: pointer;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="wishlist-container">
    <div class="wishlist-header">
      <h1 style="font-size: 42px; margin-bottom: 10px;">My Wishlist</h1>
      <p style="font-size: 18px; color: #666;">Save items you love for later</p>
    </div>

    <div class="wishlist-content">
      ${wishlistItems.length === 0 ? `
      <div class="empty-wishlist">
        <div style="font-size: 80px; margin-bottom: 30px;">❤️</div>
        <h2 style="margin-bottom: 20px;">Your wishlist is empty</h2>
        <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
          Save your favorite products here to easily find them later. When you find something you like, click the heart icon.
        </p>
        <a href="/" style="display: inline-block; background: #e53935; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Start Shopping
        </a>
      </div>
      ` : `
      <div class="wishlist-stats">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">${wishlistItems.length}</div>
            <div>Items Saved</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">₹ ${wishlistItems.reduce((sum, item) => sum + (item.price || 0), 0)}</div>
            <div>Total Value</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${wishlistItems.filter(item => item.product && item.product.stock > 0).length}</div>
            <div>In Stock</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${Math.floor((new Date() - new Date(wishlistItems[0]?.addedAt)) / (1000 * 60 * 60 * 24)) || 0}</div>
            <div>Days Old</div>
          </div>
        </div>
      </div>

      <div class="wishlist-grid">
        ${wishlistItems.map(item => `
        <div class="wishlist-item">
          <button class="remove-btn" onclick="removeFromWishlist('${item.slug}')">×</button>
          
          ${item.image ? `<img src="${item.image}" class="item-image">` : `
          <div style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">
            <div style="text-align: center;">
              <div style="font-size: 48px;">🏏</div>
              <small>No Image</small>
            </div>
          </div>
          `}
          
          <div class="item-details">
            <h3 style="margin-top: 0; margin-bottom: 10px;">${item.name}</h3>
            <div style="font-size: 20px; color: #e53935; font-weight: bold; margin-bottom: 10px;">₹ ${item.price}</div>
            
            <div style="color: ${item.product?.stock > 0 ? '#4caf50' : '#f44336'}; margin-bottom: 15px;">
              ${item.product?.stock > 0 ? '🟢 In Stock' : '🔴 Out of Stock'}
            </div>
            
            <div class="item-actions">
              <a href="/product/${item.slug}" class="view-btn">View</a>
              <button class="move-to-cart-btn" onclick="moveToCart('${item.slug}')">Add to Cart</button>
            </div>
          </div>
        </div>
        `).join('')}
      </div>

      <div class="share-wishlist">
        <h3 style="margin-top: 0; color: white;">Share Your Wishlist</h3>
        <p>Let friends and family know what you want!</p>
        <div class="share-buttons">
          <button class="share-btn" onclick="shareWishlist('whatsapp')">📱</button>
          <button class="share-btn" onclick="shareWishlist('facebook')">📘</button>
          <button class="share-btn" onclick="shareWishlist('twitter')">🐦</button>
          <button class="share-btn" onclick="shareWishlist('email')">✉️</button>
          <button class="share-btn" onclick="copyWishlistLink()">📋</button>
        </div>
      </div>

      <div style="text-align: center; margin-top: 40px;">
        <a href="/cart" style="display: inline-block; background: #111; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; margin-right: 20px;">
          View Cart
        </a>
        <button onclick="clearWishlist()" style="background: transparent; border: 2px solid #dc3545; color: #dc3545; padding: 15px 40px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 18px;">
          Clear All
        </button>
      </div>
      `}
    </div>
  </div>

  ${getFooter()}
  
  <script>
    function removeFromWishlist(slug) {
      if (confirm('Remove this item from your wishlist?')) {
        fetch('/remove-from-wishlist/' + slug, { method: 'POST' })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              location.reload();
            } else {
              alert(data.message);
            }
          });
      }
    }
    
    function moveToCart(slug) {
      fetch('/add-to-cart/' + slug, { method: 'POST' })
        .then(() => {
          fetch('/remove-from-wishlist/' + slug, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                alert('Moved to cart!');
                location.reload();
              }
            });
        });
    }
    
    function clearWishlist() {
      if (confirm('Clear your entire wishlist?')) {
        fetch('/clear-wishlist', { method: 'POST' })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              location.reload();
            }
          });
      }
    }
    
    function shareWishlist(platform) {
      const url = window.location.href;
      let shareUrl = '';
      
      switch(platform) {
        case 'whatsapp':
          shareUrl = 'https://wa.me/?text=Check out my Sports India wishlist: ' + url;
          break;
        case 'facebook':
          shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
          break;
        case 'twitter':
          shareUrl = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=My Sports India Wishlist';
          break;
        case 'email':
          shareUrl = 'mailto:?subject=My Sports India Wishlist&body=Check out my wishlist: ' + url;
          break;
      }
      
      if (shareUrl) {
        window.open(shareUrl, '_blank');
      }
    }
    
    function copyWishlistLink() {
      const url = window.location.href;
      navigator.clipboard.writeText(url)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Could not copy text: ', err));
    }
  </script>
</body>
</html>`);
});

app.post("/remove-from-wishlist/:slug", (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: "Not logged in" });
  }
  
  const wishlists = loadWishlist();
  const userIndex = wishlists.findIndex(w => w.userId === req.session.userId);
  
  if (userIndex !== -1) {
    wishlists[userIndex].items = wishlists[userIndex].items.filter(
      item => item.slug !== req.params.slug
    );
    
    if (wishlists[userIndex].items.length === 0) {
      wishlists.splice(userIndex, 1);
    }
    
    fs.writeFileSync(WISHLIST_FILE, JSON.stringify(wishlists, null, 2));
  }
  
  res.json({ success: true, message: "Removed from wishlist" });
});

app.post("/clear-wishlist", (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: "Not logged in" });
  }
  
  const wishlists = loadWishlist();
  const userIndex = wishlists.findIndex(w => w.userId === req.session.userId);
  
  if (userIndex !== -1) {
    wishlists.splice(userIndex, 1);
    fs.writeFileSync(WISHLIST_FILE, JSON.stringify(wishlists, null, 2));
  }
  
  res.json({ success: true, message: "Wishlist cleared" });
});

// ADVANCED PRODUCT FILTERING
app.get("/products/filter", (req, res) => {
  const products = loadPosts();
  const categories = getCategories(products);
  
  const category = req.query.category;
  const minPrice = parseFloat(req.query.minPrice) || 0;
  const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
  const sizes = req.query.sizes ? req.query.sizes.split(',') : [];
  const inStock = req.query.inStock === 'true';
  const sortBy = req.query.sortBy || 'newest';
  
  let filtered = products;
  
  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  
  filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);
  
  if (sizes.length > 0) {
    filtered = filtered.filter(p => 
      p.sizes && p.sizes.some(size => sizes.includes(size))
    );
  }
  
  if (inStock) {
    filtered = filtered.filter(p => p.stock > 0);
  }
  
  switch(sortBy) {
    case 'price-low':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'newest':
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
      break;
  }
  
  const allSizes = [...new Set(products.flatMap(p => p.sizes || []))].sort();
  
  const prices = products.map(p => p.price);
  const minProductPrice = Math.min(...prices);
  const maxProductPrice = Math.max(...prices);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Filter Products | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .filter-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      gap: 30px;
    }
    
    .filter-sidebar {
      width: 300px;
      flex-shrink: 0;
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      height: fit-content;
    }
    
    .filter-section {
      margin-bottom: 30px;
      padding-bottom: 25px;
      border-bottom: 1px solid #eee;
    }
    
    .filter-section:last-child {
      border-bottom: none;
    }
    
    .filter-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .clear-filters {
      color: #e53935;
      font-size: 14px;
      cursor: pointer;
    }
    
    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .filter-option {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .filter-option input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }
    
    .price-slider {
      margin-top: 20px;
    }
    
    .price-inputs {
      display: flex;
      gap: 15px;
      margin-top: 15px;
    }
    
    .price-input {
      flex: 1;
      padding: 10px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .apply-filters {
      width: 100%;
      background: #e53935;
      color: white;
      border: none;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    
    .products-main {
      flex: 1;
    }
    
    .products-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .sort-options select {
      padding: 10px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .results-count {
      color: #666;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .product-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }
    
    .product-card:hover {
      transform: translateY(-5px);
    }
    
    .product-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .product-details {
      padding: 20px;
    }
    
    .product-category {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .product-price {
      font-size: 20px;
      color: #e53935;
      font-weight: bold;
      margin: 10px 0;
    }
    
    .product-stock {
      font-size: 14px;
      margin-bottom: 15px;
    }
    
    .in-stock {
      color: #4caf50;
    }
    
    .out-stock {
      color: #f44336;
    }
    
    .product-sizes {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-bottom: 15px;
    }
    
    .size-tag {
      padding: 3px 10px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .product-actions {
      display: flex;
      gap: 10px;
    }
    
    .view-btn, .wishlist-btn, .cart-btn {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      text-align: center;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }
    
    .view-btn {
      background: #111;
      color: white;
    }
    
    .wishlist-btn {
      background: #f8f9fa;
      color: #333;
      border: 2px solid #ddd;
    }
    
    .cart-btn {
      background: #e53935;
      color: white;
      border: none;
    }
    
    .no-results {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      grid-column: 1 / -1;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 40px;
    }
    
    .page-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
    }
    
    .page-btn.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    @media (max-width: 1024px) {
      .filter-container {
        flex-direction: column;
      }
      
      .filter-sidebar {
        width: 100%;
      }
    }
    
    @media (max-width: 768px) {
      .products-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      }
    }
  </style>
</head>
<body>
  ${getHeader(req)}

  <div class="filter-container">
    <div class="filter-sidebar">
      <h2 style="margin-top: 0; margin-bottom: 30px;">Filter Products</h2>
      
      <form id="filterForm">
        <div class="filter-section">
          <div class="filter-title">
            <span>Category</span>
            <span class="clear-filters" onclick="clearCategory()">Clear</span>
          </div>
          <div class="filter-options">
            <div class="filter-option">
              <input type="radio" name="category" value="all" id="cat-all" ${!category || category === 'all' ? 'checked' : ''}>
              <label for="cat-all">All Categories</label>
            </div>
            ${categories.map(cat => `
            <div class="filter-option">
              <input type="radio" name="category" value="${cat}" id="cat-${cat}" ${category === cat ? 'checked' : ''}>
              <label for="cat-${cat}">${cat}</label>
            </div>
            `).join('')}
          </div>
        </div>
        
        <div class="filter-section">
          <div class="filter-title">
            <span>Price Range</span>
            <span class="clear-filters" onclick="clearPrice()">Clear</span>
          </div>
          <div class="price-slider">
            <input type="range" min="${minProductPrice}" max="${maxProductPrice}" value="${minPrice}" 
                   class="price-slider-min" oninput="updatePriceDisplay()">
            <input type="range" min="${minProductPrice}" max="${maxProductPrice}" value="${maxPrice === Infinity ? maxProductPrice : maxPrice}" 
                   class="price-slider-max" oninput="updatePriceDisplay()">
          </div>
          <div class="price-inputs">
            <input type="number" name="minPrice" class="price-input" placeholder="Min" value="${minPrice}" onchange="updateSliders()">
            <input type="number" name="maxPrice" class="price-input" placeholder="Max" value="${maxPrice === Infinity ? '' : maxPrice}" onchange="updateSliders()">
          </div>
          <div style="text-align: center; margin-top: 10px; color: #666; font-size: 14px;">
            Range: ₹ ${minProductPrice} - ₹ ${maxProductPrice}
          </div>
        </div>
        
        ${allSizes.length > 0 ? `
        <div class="filter-section">
          <div class="filter-title">
            <span>Size</span>
            <span class="clear-filters" onclick="clearSizes()">Clear</span>
          </div>
          <div class="filter-options">
            ${allSizes.map(size => `
            <div class="filter-option">
              <input type="checkbox" name="size" value="${size}" id="size-${size}" ${sizes.includes(size) ? 'checked' : ''}>
              <label for="size-${size}">${size}</label>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="filter-section">
          <div class="filter-title">
            <span>Availability</span>
          </div>
          <div class="filter-options">
            <div class="filter-option">
              <input type="checkbox" name="inStock" id="inStock" ${inStock ? 'checked' : ''}>
              <label for="inStock">In Stock Only</label>
            </div>
          </div>
        </div>
        
        <div class="filter-section">
          <div class="filter-title">
            <span>Sort By</span>
          </div>
          <div class="filter-options">
            <div class="filter-option">
              <input type="radio" name="sortBy" value="newest" id="sort-newest" ${sortBy === 'newest' ? 'checked' : ''}>
              <label for="sort-newest">Newest First</label>
            </div>
            <div class="filter-option">
              <input type="radio" name="sortBy" value="price-low" id="sort-price-low" ${sortBy === 'price-low' ? 'checked' : ''}>
              <label for="sort-price-low">Price: Low to High</label>
            </div>
            <div class="filter-option">
              <input type="radio" name="sortBy" value="price-high" id="sort-price-high" ${sortBy === 'price-high' ? 'checked' : ''}>
              <label for="sort-price-high">Price: High to Low</label>
            </div>
            <div class="filter-option">
              <input type="radio" name="sortBy" value="name" id="sort-name" ${sortBy === 'name' ? 'checked' : ''}>
              <label for="sort-name">Name: A to Z</label>
            </div>
          </div>
        </div>
        
        <button type="submit" class="apply-filters">Apply Filters</button>
        <button type="button" onclick="clearAllFilters()" style="width: 100%; background: #6c757d; color: white; border: none; padding: 15px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px;">
          Clear All Filters
        </button>
      </form>
    </div>
    
    <div class="products-main">
      <div class="products-header">
        <div class="results-count">
          <h2 style="margin: 0;">Products</h2>
          <p style="margin: 5px 0 0 0;">${filtered.length} products found</p>
        </div>
        <div class="sort-options">
          <select onchange="updateSort(this.value)">
            <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Sort by: Newest</option>
            <option value="price-low" ${sortBy === 'price-low' ? 'selected' : ''}>Sort by: Price Low to High</option>
            <option value="price-high" ${sortBy === 'price-high' ? 'selected' : ''}>Sort by: Price High to Low</option>
            <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
          </select>
        </div>
      </div>
      
      ${filtered.length === 0 ? `
      <div class="no-results">
        <div style="font-size: 80px; margin-bottom: 30px;">🔍</div>
        <h2 style="margin-bottom: 20px;">No products found</h2>
        <p style="color: #666; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
          Try adjusting your filters or search criteria to find what you're looking for.
        </p>
        <button onclick="clearAllFilters()" style="background: #e53935; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
          Clear All Filters
        </button>
      </div>
      ` : `
      <div class="products-grid">
        ${filtered.map(product => `
        <div class="product-card">
          ${product.images && product.images[0] ? `<img src="${product.images[0]}" class="product-image">` : `
          <div style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">
            <div style="text-align: center;">
              <div style="font-size: 48px;">🏏</div>
              <small>No Image</small>
            </div>
          </div>
          `}
          
          <div class="product-details">
            <div class="product-category">${product.category || 'General'}</div>
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">${product.name}</h3>
            
            <div class="product-price">₹ ${product.price}</div>
            
            <div class="product-stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}">
              ${product.stock > 0 ? '🟢 In Stock' : '🔴 Out of Stock'}
            </div>
            
            ${product.sizes && product.sizes.length > 0 ? `
            <div class="product-sizes">
              ${product.sizes.map(size => `<span class="size-tag">${size}</span>`).join('')}
            </div>
            ` : ''}
            
            <div class="product-actions">
              <a href="/product/${product.slug}" class="view-btn">View</a>
              <button class="wishlist-btn" onclick="addToWishlist('${product.slug}')">❤️</button>
              ${product.stock > 0 ? `
              <form method="POST" action="/add-to-cart/${product.slug}" style="display: contents;">
                <button type="submit" class="cart-btn">Add to Cart</button>
              </form>
              ` : `
              <button class="cart-btn" disabled>Out of Stock</button>
              `}
            </div>
          </div>
        </div>
        `).join('')}
      </div>
      
      ${filtered.length > 12 ? `
      <div class="pagination">
        <button class="page-btn">←</button>
        <button class="page-btn active">1</button>
        <button class="page-btn">2</button>
        <button class="page-btn">3</button>
        <button class="page-btn">...</button>
        <button class="page-btn">→</button>
      </div>
      ` : ''}
      `}
    </div>
  </div>

  ${getFooter()}
  
  <script>
    const minPrice = ${minProductPrice};
    const maxPrice = ${maxProductPrice};
    
    function updatePriceDisplay() {
      const minSlider = document.querySelector('.price-slider-min');
      const maxSlider = document.querySelector('.price-slider-max');
      const minInput = document.querySelector('input[name="minPrice"]');
      const maxInput = document.querySelector('input[name="maxPrice"]');
      
      minInput.value = minSlider.value;
      maxInput.value = maxSlider.value;
    }
    
    function updateSliders() {
      const minSlider = document.querySelector('.price-slider-min');
      const maxSlider = document.querySelector('.price-slider-max');
      const minInput = document.querySelector('input[name="minPrice"]');
      const maxInput = document.querySelector('input[name="maxPrice"]');
      
      minSlider.value = minInput.value || minPrice;
      maxSlider.value = maxInput.value || maxPrice;
    }
    
    function clearCategory() {
      document.getElementById('cat-all').checked = true;
    }
    
    function clearPrice() {
      document.querySelector('input[name="minPrice"]').value = minPrice;
      document.querySelector('input[name="maxPrice"]').value = '';
      updateSliders();
    }
    
    function clearSizes() {
      document.querySelectorAll('input[name="size"]').forEach(cb => {
        cb.checked = false;
      });
    }
    
    function clearAllFilters() {
      clearCategory();
      clearPrice();
      clearSizes();
      document.getElementById('inStock').checked = false;
      document.getElementById('sort-newest').checked = true;
      document.getElementById('filterForm').submit();
    }
    
    function updateSort(value) {
      const form = document.getElementById('filterForm');
      const sortInput = document.createElement('input');
      sortInput.type = 'hidden';
      sortInput.name = 'sortBy';
      sortInput.value = value;
      form.appendChild(sortInput);
      form.submit();
    }
    
    function addToWishlist(slug) {
      fetch('/add-to-wishlist/' + slug, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Added to wishlist!');
          } else {
            alert(data.message);
          }
        });
    }
    
    updateSliders();
    
    document.getElementById('filterForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const params = new URLSearchParams();
      
      for (const [key, value] of formData.entries()) {
        if (key === 'size') {
          const sizes = formData.getAll('size');
          if (sizes.length > 0) {
            params.set('sizes', sizes.join(','));
          }
        } else if (value) {
          params.set(key, value);
        }
      }
      
      window.location.href = '/products/filter?' + params.toString();
    });
  </script>
</body>
</html>`);
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found | Sports India</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        .error-container { text-align: center; padding: 100px 20px; }
        .error-code { font-size: 72px; color: #e53935; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      ${getHeader(req)}
      <div class="error-container">
        <div class="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" style="display: inline-block; background: #e53935; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none;">Go to Homepage</a>
      </div>
      ${getFooter()}
    </body>
    </html>
  `);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send('File too large. Maximum size is 5MB.');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).send('Too many files. Maximum is 5 files.');
    }
  }
  
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error | Sports India</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
        a { text-decoration: none; color: #111; }
        a:hover { color: #e53935; }
        button { cursor: pointer; }
        .error-container { text-align: center; padding: 100px 20px; }
        .error-code { font-size: 72px; color: #e53935; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      ${getHeader(req)}
      <div class="error-container">
        <div class="error-code">500</div>
        <h1>Internal Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
        <a href="/" style="display: inline-block; background: #e53935; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none;">Go to Homepage</a>
      </div>
      ${getFooter()}
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ All security features have been removed for development`);
  console.log(`📝 Admin login: admin / admin123`);
  console.log(`🔗 http://localhost:${PORT}`);

});
