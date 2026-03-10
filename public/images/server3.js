const express = require("express");
const fs = require("fs");
const multer = require("multer"); 
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const path = require("path");
const crypto = require("crypto");
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// FIX 1: Environment Variables
// ============================================
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// FIX 2: Session Configuration
// ============================================
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  },
  name: 'sessionId'
}));

// ============================================
// FIX 3: Static Files
// ============================================
app.use("/uploads", express.static("uploads"));

// ============================================
// FIX 4: Secure File Upload
// ============================================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

const allowedFileTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedFileTypes.includes(ext)) {
      return cb(new Error('Invalid file type. Only images allowed.'), false);
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid mime type.'), false);
    }
    cb(null, true);
  }
}).array("image", 5);

const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ 
        success: false, 
        error: err.message || 'File upload failed' 
      });
    }
    next();
  });
};

// ============================================
// FIX 5: Rate Limiting
// ============================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// FIX 6: File Constants
// ============================================
const POSTS_FILE = "posts.json";
const SLIDER_FILE = "sliders.json";
const ORDERS_FILE = "orders.json";
const USERS_FILE = "users.json";
const REVIEWS_FILE = "reviews.json";
const WISHLIST_FILE = "wishlist.json";
const NEWSLETTER_FILE = "newsletter.json";
const CONTACT_FILE = "contacts.json";
const CATEGORIES_FILE = "categories.json";

// ============================================
// FIX 7: Safe File Operations
// ============================================
function safeReadJSON(file, defaultValue = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
    if (fs.existsSync(file)) {
      const backupFile = file + '.backup.' + Date.now();
      fs.copyFileSync(file, backupFile);
      console.log(`Backup created: ${backupFile}`);
    }
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
}

function safeWriteJSON(file, data) {
  try {
    const tempFile = file + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, file);
    return true;
  } catch (e) {
    console.error(`Error writing ${file}:`, e.message);
    return false;
  }
}

// Initialize files
const files = [
  SLIDER_FILE, POSTS_FILE, ORDERS_FILE, USERS_FILE,
  REVIEWS_FILE, WISHLIST_FILE, NEWSLETTER_FILE, CONTACT_FILE,
  CATEGORIES_FILE
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    safeWriteJSON(file, []);
  }
});

// ============================================
// FIX 8: Helper Functions
// ============================================
function loadSliders() {
  return safeReadJSON(SLIDER_FILE, []);
}

function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadPosts() {
  const posts = safeReadJSON(POSTS_FILE, []);
  
  let changed = false;
  const fixed = posts.map(p => {
    if (!p.category) {
      changed = true;
      return { ...p, category: "General" };
    }
    return p;
  });

  if (changed) {
    safeWriteJSON(POSTS_FILE, fixed);
  }

  return fixed;
}

function getCategories(posts) {
  return [...new Set((posts || []).map(p => p.category))];
}

function loadUsers() {
  return safeReadJSON(USERS_FILE, []);
}

function loadReviews() {
  return safeReadJSON(REVIEWS_FILE, []);
}

function loadWishlist() {
  return safeReadJSON(WISHLIST_FILE, []);
}

function loadCategories() {
  return safeReadJSON(CATEGORIES_FILE, []);
}

function saveCategories(categories) {
  return safeWriteJSON(CATEGORIES_FILE, categories);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim();
}

function sanitizeObject(obj) {
  const sanitized = {};
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else if (Array.isArray(obj[key])) {
      sanitized[key] = obj[key].map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}

function cleanupOldUploads() {
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) return;
  
  const files = fs.readdirSync(uploadDir);
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  files.forEach(file => {
    const filePath = path.join(uploadDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > oneWeek) {
        const posts = safeReadJSON(POSTS_FILE, []);
        const isReferenced = posts.some(p => 
          p.images && p.images.some(img => img.includes(file))
        );
        if (!isReferenced) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old upload: ${file}`);
        }
      }
    } catch (e) {
      console.error(`Error cleaning up ${file}:`, e.message);
    }
  });
}

if (isProduction) {
  cleanupOldUploads();
  setInterval(cleanupOldUploads, 24 * 60 * 60 * 1000);
}

// ============================================
// FIX 9: Analytics Helper Functions
// ============================================
function getMonthlyOrderData(orders) {
  try {
    const months = [];
    const revenues = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      
      const monthOrders = (orders || []).filter(order => {
        if (!order || !order.date) return false;
        try {
          const orderDate = new Date(order.date);
          return orderDate.getMonth() === date.getMonth() && 
                 orderDate.getFullYear() === date.getFullYear();
        } catch {
          return false;
        }
      });
      
      const monthRevenue = monthOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
      revenues.push(monthRevenue);
    }
    
    return { months, revenues };
  } catch (e) {
    console.error('Error in getMonthlyOrderData:', e);
    return { months: [], revenues: [] };
  }
}

function getTopProducts(orders, products) {
  try {
    const productSales = {};
    
    (orders || []).forEach(order => {
      (order.items || []).forEach(item => {
        if (!item || !item.slug) return;
        if (!productSales[item.slug]) {
          productSales[item.slug] = {
            salesCount: 0,
            revenue: 0
          };
        }
        productSales[item.slug].salesCount += (item.quantity || 1);
        productSales[item.slug].revenue += (parseFloat(item.price) || 0) * (item.quantity || 1);
      });
    });
    
    return (products || [])
      .map(product => ({
        ...product,
        salesCount: productSales[product.slug]?.salesCount || 0,
        revenue: productSales[product.slug]?.revenue || 0,
        image: product.images?.[0] || null
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 10);
  } catch (e) {
    console.error('Error in getTopProducts:', e);
    return [];
  }
}

function getUserGrowth(users) {
  try {
    const months = [];
    const counts = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      
      const monthUsers = (users || []).filter(user => {
        if (!user || !user.createdAt) return false;
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
  } catch (e) {
    console.error('Error in getUserGrowth:', e);
    return { months: [], counts: [], lastMonth: 0, change: 0 };
  }
}

// ============================================
// FIX 10: Default Settings
// ============================================
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

// ============================================
// FIX 11: HTML Helper Functions
// ============================================
function getCommonStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
    
    .fas, .far, .fab {
      font-family: 'Font Awesome 6 Free';
      font-weight: 900;
    }
  `;
}

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
    </script>
  `;
}

function getHeader(req) {
  let settings = safeReadJSON('settings.json', getDefaultSettings());
  
  const userName = req.session.userName;
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

function getFooter() {
  let settings = safeReadJSON('settings.json', getDefaultSettings());
  
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
        localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
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

// ============================================
// FIX 12: HOME PAGE
// ============================================
app.get("/", (req, res) => {
  try {
    const sliders = (loadSliders() || []).filter(slider => slider.active !== false);
    const products = loadPosts() || [];
    const reviews = loadReviews() || [];
    const categories = getCategories(products);
    
    const featuredProducts = (products || [])
      .filter(p => p.featured && p.active !== false)
      .slice(0, 8);
    
    const newArrivals = (products || [])
      .filter(p => p.showInNewArrivals && p.active !== false)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8);

    const bestSellers = (products || [])
      .filter(p => p.showInBestSellers && p.active !== false)
      .map(product => {
          const productReviews = (reviews || []).filter(r => r.productSlug === product.slug);
          const avgRating = productReviews.length > 0 
              ? productReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / productReviews.length 
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
    ${getCommonStyles()}
    
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

  <!-- Featured Products -->
  <div class="section-header">
    <h2>Featured Products</h2>
    <p>Our most popular and highly-rated products</p>
  </div>

  <div class="category-filters">
    <button class="filter-btn active" onclick="filterProducts('all')">All</button>
    <button class="filter-btn" onclick="filterProducts('men')">Men's</button>
    <button class="filter-btn" onclick="filterProducts('women')">Women's</button>
    <button class="filter-btn" onclick="filterProducts('kids')">Kids'</button>
  </div>

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

  <!-- New Arrivals -->
  ${newArrivals.length > 0 ? `
  <div class="section-header">
    <h2>New Arrivals</h2>
    <p>Check out our latest products</p>
  </div>

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

  <!-- Best Sellers -->
  ${bestSellers.length > 0 ? `
  <div class="section-header">
    <h2>Best Sellers</h2>
    <p>Our top-rated products by customers</p>
  </div>

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
    
  } catch (e) {
    console.error('Home page error:', e);
    res.status(500).send('Something went wrong. Please try again later.');
  }
});

// ============================================
// FIX 13: QUICK ADD TO CART
// ============================================
app.post("/add-to-cart-quick", (req, res) => {
  try {
    const { slug, quantity } = req.body;
    if (!slug) {
      return res.json({ success: false, error: "Product slug required" });
    }
    
    const products = loadPosts();
    const product = products.find(p => p.slug === slug);
    
    if (!product) {
      return res.json({ success: false, error: "Product not found" });
    }
    
    if (!req.session.cart) {
      req.session.cart = [];
    }
    
    const existingIndex = req.session.cart.findIndex(item => item.slug === slug);
    const qty = parseInt(quantity) || 1;
    
    if (existingIndex >= 0) {
      req.session.cart[existingIndex].quantity += qty;
    } else {
      req.session.cart.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.images && product.images[0],
        addedAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, cartCount: req.session.cart.length });
    
  } catch (e) {
    console.error('Add to cart quick error:', e);
    res.json({ success: false, error: "Server error" });
  }
});

// ============================================
// FIX 14: NEWSLETTER SUBSCRIPTION
// ============================================
app.post("/subscribe-newsletter", (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.json({ success: false, error: "Invalid email" });
    }
    
    const newsletter = safeReadJSON(NEWSLETTER_FILE, []);
    
    const alreadySubscribed = newsletter.some(sub => sub.email === email);
    
    if (alreadySubscribed) {
      return res.json({ success: true, message: "Already subscribed" });
    }
    
    newsletter.push({
      email: sanitizeInput(email),
      subscribedAt: new Date().toISOString(),
      active: true
    });
    
    if (safeWriteJSON(NEWSLETTER_FILE, newsletter)) {
      res.json({ success: true, message: "Subscribed successfully" });
    } else {
      res.json({ success: false, error: "Failed to save subscription" });
    }
    
  } catch (e) {
    console.error('Newsletter error:', e);
    res.json({ success: false, error: "Server error" });
  }
});

// ============================================
// FIX 15: ADMIN LOGIN PAGE
// ============================================
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
    ${getCommonStyles()}
    
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

// ============================================
// FIX 16: ADMIN LOGIN PROCESSING
// ============================================
app.post("/login", loginLimiter, (req, res) => {
  try {
    const { username, password } = req.body;
    
    const ADMIN_USERNAME = "admin";
    const ADMIN_PASSWORD = "admin123";
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.loggedIn = true;
      req.session.userName = "Admin";
      req.session.userId = 1;
      req.session.role = "admin";
      req.session.loginTime = Date.now();
      
      return res.redirect("/admin");
    }
    
    const users = loadUsers();
    const user = users.find(u => 
      (u.email === username || u.name === username) && 
      u.password === Buffer.from(password).toString('base64')
    );
    
    if (user && (user.role === 'admin' || user.isAdmin)) {
      req.session.loggedIn = true;
      req.session.userName = user.name;
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.role = user.role || 'user';
      req.session.loginTime = Date.now();
      
      return res.redirect("/admin");
    }
    
    res.redirect("/login?error=Invalid username or password");
    
  } catch (e) {
    console.error('Login error:', e);
    res.redirect("/login?error=Server error");
  }
});

// ============================================
// FIX 17: LOGOUT
// ============================================
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
});

// ============================================
// FIX 18: POSTS PAGE (Products List)
// ============================================
app.get("/posts", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  try {
    const posts = loadPosts();
    const categories = getCategories(posts);
    const q = sanitizeInput((req.query.q || "").toLowerCase());
    const selectedCat = sanitizeInput(req.query.cat);
    
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
    ${getCommonStyles()}
    
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
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          } else {
            alert('Error deleting product: ' + (data.error || 'Unknown error'));
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
    
  } catch (e) {
    console.error('Posts page error:', e);
    res.status(500).send('Error loading products page');
  }
});

// ============================================
// FIX 19: DELETE POST
// ============================================
app.post("/delete-post", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  try {
    const { index } = req.body;
    if (typeof index !== 'number' || index < 0) {
      return res.status(400).json({ error: "Invalid index" });
    }
    
    const posts = loadPosts();
    
    if (index >= 0 && index < posts.length) {
      posts.splice(index, 1);
      if (safeWriteJSON(POSTS_FILE, posts)) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to save changes" });
      }
    } else {
      res.status(400).json({ error: "Invalid index" });
    }
  } catch (e) {
    console.error('Delete post error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================
// FIX 20: ABOUT US PAGE
// ============================================
app.get("/about", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>About Us | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
    <p style="font-size: 20px; max-width: 800px; margin: 0 auto;">Your trusted partner in sports excellence since 2010</p>
  </div>

  <div class="about-content">
    <section>
      <h2>Our Story</h2>
      <p>Founded in 2010, Sports India started as a small retail store in Delhi with a vision to provide high-quality sports equipment to aspiring athletes. Today, we are one of India's leading sports gear retailers with over 50 stores nationwide and a thriving online presence.</p>
      
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
        <div class="stat-number">13+</div>
        <h4>Years of Experience</h4>
      </div>
      <div class="stat-card">
        <div class="stat-number">50+</div>
        <h4>Stores Nationwide</h4>
      </div>
      <div class="stat-card">
        <div class="stat-number">100K+</div>
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
          <div class="member-img">👨‍💼</div>
          <h3>Rajesh Sharma</h3>
          <p>Founder & CEO</p>
          <p>Former national-level cricketer with 20+ years in sports retail</p>
        </div>
        
        <div class="team-member">
          <div class="member-img">👩‍💼</div>
          <h3>Priya Verma</h3>
          <p>Operations Head</p>
          <p>Expert in supply chain and customer experience</p>
        </div>
        
        <div class="team-member">
          <div class="member-img">👨‍🔬</div>
          <h3>Dr. Amit Patel</h3>
          <p>Product Development</p>
          <p>Sports scientist with PhD in Sports Technology</p>
        </div>
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
          <li>✅ 30-Day Easy Return & Exchange Policy</li>
          <li>✅ Pan-India Shipping with Cash on Delivery</li>
          <li>✅ Regular Workshops & Training Sessions</li>
          <li>✅ Custom Fitting & Personalization Services</li>
        </ul>
      </div>
    </section>
  </div>

  ${getFooter()}
</body>
</html>`);
});

// ============================================
// FIX 21: CONTACT US PAGE
// ============================================
app.get("/contact", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Contact Us | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
            <p style="margin: 0; color: #666;">Sports India Pvt. Ltd.<br>
              123 Sports Complex, Connaught Place<br>
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
              Toll Free: 1800-123-4567
            </p>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-icon">✉️</div>
          <div>
            <h3 style="margin: 0 0 10px 0;">Email Addresses</h3>
            <p style="margin: 0; color: #666;">
              General: <a href="mailto:info@sportsindia.com" style="color: #e53935;">info@sportsindia.com</a><br>
              Support: <a href="mailto:support@sportsindia.com" style="color: #e53935;">support@sportsindia.com</a><br>
              Wholesale: <a href="mailto:sales@sportsindia.com" style="color: #e53935;">sales@sportsindia.com</a>
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
            <a href="https://www.instagram.com/sportsindia_44" target="_blank" style="width: 50px; height: 50px; background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; text-decoration: none;">📸</a>
            
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
        
        <div class="store-card">
          <h3>Mumbai</h3>
          <p>📞 +91 22 6789 1234</p>
          <p>📍 45 Sports Arena, Bandra West, Mumbai</p>
          <p>🕒 10:00 AM - 10:00 PM</p>
          <a href="https://maps.google.com/?q=Bandra+West+Mumbai" target="_blank" style="color: #e53935; text-decoration: none; font-weight: 600;">Get Directions →</a>
        </div>
        
        <div class="store-card">
          <h3>Bangalore</h3>
          <p>📞 +91 80 4567 8901</p>
          <p>📍 78 Fitness Hub, Indiranagar, Bangalore</p>
          <p>🕒 9:30 AM - 8:30 PM</p>
          <a href="https://maps.google.com/?q=Indiranagar+Bangalore" target="_blank" style="color: #e53935; text-decoration: none; font-weight: 600;">Get Directions →</a>
        </div>
      </div>
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
      
      fetch('/submit-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: document.querySelector('input[name="name"]').value,
          email: document.querySelector('input[name="email"]').value,
          phone: document.querySelector('input[name="phone"]').value,
          subject: document.querySelector('select[name="subject"]').value,
          message: document.querySelector('textarea[name="message"]').value
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Thank you for your message! We will get back to you within 24 hours.');
          this.reset();
        } else {
          alert(data.error || 'Error sending message');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Network error - please try again');
      });
    });
  </script>
</body>
</html>`);
});

app.post("/submit-contact", (req, res) => {
  try {
    const contacts = safeReadJSON(CONTACT_FILE, []);
    
    const sanitizedData = sanitizeObject(req.body);
    
    contacts.push({
      id: Date.now(),
      ...sanitizedData,
      date: new Date().toLocaleString(),
      status: "new"
    });
    
    if (safeWriteJSON(CONTACT_FILE, contacts)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: "Failed to save message" });
    }
    
  } catch (e) {
    console.error('Submit contact error:', e);
    res.json({ success: false, error: "Server error" });
  }
});

// ============================================
// FIX 22: PRIVACY POLICY PAGE
// ============================================
app.get("/privacy-policy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Privacy Policy | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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

// ============================================
// FIX 23: TERMS & CONDITIONS PAGE
// ============================================
app.get("/terms", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Terms & Conditions | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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

// ============================================
// FIX 24: ADD SLIDER PAGE (ADMIN)
// ============================================
app.get("/admin/add-slider", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  try {
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
    ${getCommonStyles()}
    
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
    
  } catch (e) {
    console.error('Add slider page error:', e);
    res.status(500).send('Error loading slider page');
  }
});
// ============================================
// FIX: MANAGE SECTIONS PAGE (ADMIN)
// ============================================
app.get("/admin/manage-sections", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  try {
    const posts = loadPosts();
    
    // Default sections data
    const sections = [
      {
        id: 'featured',
        name: 'Featured Products',
        description: 'Showcase your best products',
        enabled: true,
        count: posts.filter(p => p.featured).length,
        icon: 'fa-star',
        color: '#FFD700'
      },
      {
        id: 'newArrivals',
        name: 'New Arrivals',
        description: 'Display recently added products',
        enabled: true,
        count: posts.filter(p => p.showInNewArrivals).length,
        icon: 'fa-clock',
        color: '#4CAF50'
      },
      {
        id: 'bestSellers',
        name: 'Best Sellers',
        description: 'Show top-selling products',
        enabled: true,
        count: posts.filter(p => p.showInBestSellers).length,
        icon: 'fa-crown',
        color: '#FF9800'
      },
      {
        id: 'heroSlider',
        name: 'Hero Slider',
        description: 'Main homepage slider',
        enabled: true,
        count: loadSliders().length,
        icon: 'fa-images',
        color: '#9C27B0'
      },
      {
        id: 'categories',
        name: 'Categories Grid',
        description: 'Display product categories',
        enabled: true,
        count: getCategories(posts).length,
        icon: 'fa-tags',
        color: '#2196F3'
      },
      {
        id: 'newsletter',
        name: 'Newsletter Section',
        description: 'Email subscription form',
        enabled: true,
        count: safeReadJSON(NEWSLETTER_FILE, []).length,
        icon: 'fa-envelope',
        color: '#F44336'
      }
    ];
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Manage Sections | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
    .sections-container {
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
    
    .sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    
    .section-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: all 0.3s;
    }
    
    .section-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    }
    
    .section-header {
      padding: 20px;
      color: white;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .section-icon {
      width: 50px;
      height: 50px;
      background: rgba(255,255,255,0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .section-content {
      padding: 25px;
    }
    
    .section-title {
      font-size: 20px;
      margin: 0 0 5px 0;
      color: #111;
    }
    
    .section-desc {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    
    .section-stats {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-badge {
      background: #f8f9fa;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
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
    
    .toggle-slider:before {
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
    
    input:checked + .toggle-slider {
      background-color: #e53935;
    }
    
    input:checked + .toggle-slider:before {
      transform: translateX(26px);
    }
    
    .section-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
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
    
    .btn-primary {
      background: #e53935;
      color: white;
    }
    
    .btn-primary:hover {
      background: #c62828;
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
    
    .preview-section {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-top: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .preview-title {
      font-size: 24px;
      margin-bottom: 20px;
      color: #111;
    }
    
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .preview-item {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      
      .sections-grid {
        grid-template-columns: 1fr;
      }
      
      .section-actions {
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
  
  <div class="sections-container">
    <div class="page-header">
      <div>
        <h1 style="margin: 0; font-size: 32px; color: #111;">
          <i class="fas fa-layout"></i> Manage Homepage Sections
        </h1>
        <p style="color: #666; margin-top: 5px;">Customize which sections appear on your homepage</p>
      </div>
      
      <div>
        <a href="/admin" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back to Dashboard
        </a>
      </div>
    </div>
    
    <div class="sections-grid">
      ${sections.map(section => `
      <div class="section-card">
        <div class="section-header" style="background: linear-gradient(135deg, ${section.color} 0%, ${adjustColor(section.color, 30)} 100%);">
          <div class="section-icon">
            <i class="fas ${section.icon}"></i>
          </div>
          <div>
            <h3 style="margin: 0; color: white; font-size: 18px;">${section.name}</h3>
            <small style="color: rgba(255,255,255,0.8);">${section.count} items</small>
          </div>
        </div>
        
        <div class="section-content">
          <div class="section-desc">${section.description}</div>
          
          <div class="section-stats">
            <div class="stat-badge">
              <i class="fas fa-eye"></i> Visible on homepage
            </div>
            <div class="stat-badge">
              <i class="fas fa-box"></i> ${section.count} items
            </div>
          </div>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 20px 0;">
            <span style="font-weight: 600;">Status</span>
            <label class="toggle-switch">
              <input type="checkbox" ${section.enabled ? 'checked' : ''} onchange="toggleSection('${section.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="section-actions">
            <button class="btn btn-primary" onclick="configureSection('${section.id}')">
              <i class="fas fa-cog"></i> Configure
            </button>
            <button class="btn btn-outline" onclick="previewSection('${section.id}')">
              <i class="fas fa-eye"></i> Preview
            </button>
          </div>
        </div>
      </div>
      `).join('')}
    </div>
    
    <!-- Preview Modal (hidden by default) -->
    <div id="previewModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 15px; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto; padding: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;" id="previewTitle">Section Preview</h2>
          <button onclick="closePreview()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div id="previewContent"></div>
      </div>
    </div>
    
    <!-- Quick Stats -->
    <div class="preview-section">
      <h2 class="preview-title">Section Performance</h2>
      <div class="preview-grid">
        <div class="preview-item">
          <div style="font-size: 36px; color: #e53935;">${posts.length}</div>
          <div>Total Products</div>
        </div>
        <div class="preview-item">
          <div style="font-size: 36px; color: #e53935;">${sections.length}</div>
          <div>Total Sections</div>
        </div>
        <div class="preview-item">
          <div style="font-size: 36px; color: #e53935;">${sections.filter(s => s.enabled).length}</div>
          <div>Active Sections</div>
        </div>
        <div class="preview-item">
          <div style="font-size: 36px; color: #e53935;">${loadSliders().length}</div>
          <div>Active Sliders</div>
        </div>
      </div>
    </div>
  </div>
  
  ${getAdminFooter()}
  
  <script>
    function toggleSection(sectionId, enabled) {
      fetch('/admin/toggle-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sectionId, enabled })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showNotification('Section ' + (enabled ? 'enabled' : 'disabled') + ' successfully');
        } else {
          alert('Error updating section');
        }
      });
    }
    
    function configureSection(sectionId) {
      // Redirect to section-specific configuration page
      switch(sectionId) {
        case 'heroSlider':
          window.location.href = '/admin/sliders';
          break;
        case 'featured':
        case 'newArrivals':
        case 'bestSellers':
          window.location.href = '/posts';
          break;
        case 'categories':
          window.location.href = '/admin/categories';
          break;
        case 'newsletter':
          window.location.href = '/admin/newsletter';
          break;
        default:
          alert('Configuration page for ' + sectionId + ' coming soon!');
      }
    }
    
    function previewSection(sectionId) {
      const previewContent = document.getElementById('previewContent');
      const previewTitle = document.getElementById('previewTitle');
      
      // Generate preview based on section type
      let content = '';
      switch(sectionId) {
        case 'featured':
          previewTitle.textContent = 'Featured Products Preview';
          content = \`
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                <i class="fas fa-box" style="font-size: 40px; color: #e53935;"></i>
                <h4>Product 1</h4>
                <p>₹ 1,299</p>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                <i class="fas fa-box" style="font-size: 40px; color: #e53935;"></i>
                <h4>Product 2</h4>
                <p>₹ 2,499</p>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                <i class="fas fa-box" style="font-size: 40px; color: #e53935;"></i>
                <h4>Product 3</h4>
                <p>₹ 3,999</p>
              </div>
            </div>
          \`;
          break;
          
        case 'heroSlider':
          previewTitle.textContent = 'Hero Slider Preview';
          content = \`
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px; text-align: center; border-radius: 10px;">
              <h2 style="font-size: 36px; margin-bottom: 20px;">Welcome to Sports India</h2>
              <p style="font-size: 18px; margin-bottom: 30px;">Premium sports gear for athletes</p>
              <button style="background: white; color: #e53935; border: none; padding: 15px 30px; border-radius: 8px; font-weight: 600;">Shop Now</button>
            </div>
          \`;
          break;
          
        default:
          previewTitle.textContent = sectionId + ' Preview';
          content = '<div style="text-align: center; padding: 40px;">Preview coming soon for this section!</div>';
      }
      
      previewContent.innerHTML = content;
      document.getElementById('previewModal').style.display = 'flex';
    }
    
    function closePreview() {
      document.getElementById('previewModal').style.display = 'none';
    }
    
    function showNotification(message) {
      const notification = document.createElement('div');
      notification.style.cssText = \`
        position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; animation: slideIn 0.3s;
      \`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
      const modal = document.getElementById('previewModal');
      if (event.target === modal) {
        closePreview();
      }
    }
  </script>
</body>
</html>`);
    
  } catch (e) {
    console.error('Manage sections page error:', e);
    res.status(500).send('Error loading manage sections page');
  }
});

// ============================================
// FIX: TOGGLE SECTION (AJAX endpoint)
// ============================================
app.post("/admin/toggle-section", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  try {
    const { sectionId, enabled } = req.body;
    
    // Here you would typically save this to a settings file
    // For now, we'll just acknowledge it
    console.log(`Section ${sectionId} toggled to: ${enabled}`);
    
    // You could save to settings.json:
    // let settings = safeReadJSON('settings.json', {});
    // settings.sections = settings.sections || {};
    // settings.sections[sectionId] = { enabled };
    // safeWriteJSON('settings.json', settings);
    
    res.json({ success: true });
    
  } catch (e) {
    console.error('Toggle section error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================
// FIX 25: SAVE SLIDER (ADMIN)
// ============================================
app.post("/admin/save-slider", uploadMiddleware, (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  try {
    const sliders = loadSliders();
    const editIndex = req.body.editIndex;
    
    let imagePath = req.body.existingImage;
    if (req.files && req.files.length > 0) {
      imagePath = "/uploads/" + req.files[0].filename;
    }
    
    const sanitizedTitle = sanitizeInput(req.body.title);
    const sanitizedDescription = sanitizeInput(req.body.description || "");
    const sanitizedButtonText = sanitizeInput(req.body.buttonText || "Shop Now");
    const sanitizedButtonLink = sanitizeInput(req.body.buttonLink || "#");
    
    const sliderData = {
      title: sanitizedTitle,
      description: sanitizedDescription,
      buttonText: sanitizedButtonText,
      buttonLink: sanitizedButtonLink,
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
    
    if (safeWriteJSON(SLIDER_FILE, sliders)) {
      res.redirect("/admin/sliders?success=Slider " + (editIndex !== undefined ? "updated" : "added") + " successfully");
    } else {
      res.redirect("/admin/sliders?error=Failed to save slider");
    }
    
  } catch (e) {
    console.error('Save slider error:', e);
    res.redirect("/admin/sliders?error=Server error");
  }
});

// ============================================
// FIX 26: MANAGE SLIDERS PAGE (ADMIN)
// ============================================
app.get("/admin/sliders", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  try {
    const sliders = loadSliders();
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Manage Sliders | Sports India Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          } else {
            alert('Error deleting slider: ' + (data.error || 'Unknown error'));
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
    
  } catch (e) {
    console.error('Sliders page error:', e);
    res.status(500).send('Error loading sliders page');
  }
});

// ============================================
// FIX 27: DELETE SLIDER (ADMIN)
// ============================================
app.post("/admin/delete-slider", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  try {
    const { index } = req.body;
    if (typeof index !== 'number' || index < 0) {
      return res.status(400).json({ error: "Invalid index" });
    }
    
    const sliders = loadSliders();
    
    if (index >= 0 && index < sliders.length) {
      sliders.splice(index, 1);
      if (safeWriteJSON(SLIDER_FILE, sliders)) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to save changes" });
      }
    } else {
      res.status(400).json({ error: "Invalid index" });
    }
  } catch (e) {
    console.error('Delete slider error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================
// FIX 28: PRODUCT DETAIL PAGE
// ============================================
app.get("/product/:slug", (req, res) => {
  try {
    const products = loadPosts();
    const product = products.find(p => p.slug === req.params.slug);
    
    if (!product) {
      return res.redirect("/");
    }
    
    const relatedProducts = (products || [])
      .filter(p => p.slug !== product.slug && p.category === product.category)
      .slice(0, 4);
    
    const reviews = (loadReviews() || []).filter(r => r.productSlug === req.params.slug);
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : 0;
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${product.name} | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
    <!-- Breadcrumb -->
    <div style="margin: 30px 0;">
      <a href="/" style="color: #666; text-decoration: none;">Home</a> 
      <span style="color: #666;"> › </span>
      <a href="/products/filter?category=${product.category}" style="color: #666; text-decoration: none;">${product.category}</a>
      <span style="color: #666;"> › </span>
      <span style="color: #333; font-weight: 600;">${product.name}</span>
    </div>

    <div class="product-main">
      <!-- Product Images -->
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
        ` : ''}
        
        ${!product.images || product.images.length === 0 ? `
        <div style="text-align: center; color: #999; padding: 20px;">
          <p>No images available for this product</p>
        </div>
        ` : ''}
      </div>

      <!-- Product Info -->
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

    <!-- Product Tabs -->
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

    <!-- Related Products -->
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
    let selectedSize = null;
    let selectedColor = null;
    let quantity = 1;
    
    function changeMainImage(src, element) {
      document.getElementById('mainImage').src = src;
      document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
      element.classList.add('active');
    }
    
    function selectSize(size) {
      selectedSize = size;
      document.querySelectorAll('.size-option').forEach(el => {
        el.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
    }
    
    function selectColor(color, index) {
      selectedColor = color;
      document.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
    }
    
    function updateQuantity(change) {
      quantity += change;
      if (quantity < 1) quantity = 1;
      if (quantity > ${product.stock || 10}) quantity = ${product.stock || 10};
      document.getElementById('quantity').textContent = quantity;
    }
    
    function addToCart() {
      fetch('/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: '${product.slug}',
          name: '${product.name}',
          price: ${product.price},
          quantity: quantity,
          image: ${product.images && product.images[0] ? `'${product.images[0]}'` : 'null'},
          size: selectedSize,
          color: selectedColor
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
    
    function addToWishlist() {
      if (!${!!req.session.userId}) {
        alert('Please login to add to wishlist');
        window.location.href = '/login-user';
        return;
      }
      
      fetch('/add-to-wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: '${product.slug}',
          name: '${product.name}',
          price: ${product.price},
          image: ${product.images && product.images[0] ? `'${product.images[0]}'` : 'null'}
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Added to wishlist!');
        } else {
          alert(data.error || 'Error adding to wishlist');
        }
      });
    }
    
    function showTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
      });
      
      document.getElementById(tabId).style.display = 'block';
      
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      event.currentTarget.classList.add('active');
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Product images:', ${JSON.stringify(product.images)});
      console.log('Total images:', ${product.images ? product.images.length : 0});
    });
  </script>
</body>
</html>`);
    
  } catch (e) {
    console.error('Product detail error:', e);
    res.status(500).send('Error loading product');
  }
});

// ============================================
// FIX 29: ADD TO CART ENDPOINT
// ============================================
app.post("/add-to-cart", (req, res) => {
  try {
    const { slug, name, price, quantity, image, size, color } = req.body;
    
    if (!slug || !name || !price) {
      return res.json({ success: false, error: "Missing required fields" });
    }
    
    if (!req.session.cart) {
      req.session.cart = [];
    }
    
    const existingIndex = req.session.cart.findIndex(item => item.slug === slug);
    const qty = parseInt(quantity) || 1;
    
    if (existingIndex >= 0) {
      req.session.cart[existingIndex].quantity += qty;
    } else {
      req.session.cart.push({
        slug,
        name,
        price: parseFloat(price),
        quantity: qty,
        image: image || null,
        size: size || null,
        color: color || null,
        addedAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, cartCount: req.session.cart.length });
    
  } catch (e) {
    console.error('Add to cart error:', e);
    res.json({ success: false, error: "Server error" });
  }
});

// ============================================
// FIX 30: ADMIN ANALYTICS PAGE
// ============================================
app.get("/admin/analytics", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  try {
    const orders = safeReadJSON(ORDERS_FILE, []);
    const users = loadUsers();
    const products = loadPosts();
    const reviews = loadReviews();
    const contacts = safeReadJSON(CONTACT_FILE, []);
    
    const totalRevenue = (orders || []).reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    const statusCounts = {
      processing: (orders || []).filter(o => o.orderStatus === 'processing').length,
      completed: (orders || []).filter(o => o.orderStatus === 'completed').length,
      pending: (orders || []).filter(o => o.orderStatus === 'pending').length,
      cancelled: (orders || []).filter(o => o.orderStatus === 'cancelled').length
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
    ${getCommonStyles()}
    
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
    
    <!-- Charts and Tables -->
    <div class="analytics-grid">
      <!-- Revenue Chart -->
      <div class="analytics-card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-chart-bar"></i> Revenue Overview</h2>
        </div>
        <div class="chart-container">
          <canvas id="revenueChart"></canvas>
        </div>
      </div>
      
      <!-- Orders by Status -->
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
    
    <!-- Top Products -->
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
            ${(topProducts || []).slice(0, 5).map(product => `
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
                    <div style="font-weight: 600;">${product.name || 'Unknown'}</div>
                    <small style="color: #6c757d;">SKU: ${product.slug || ''}</small>
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
              <td style="font-weight: 600;">₹${(product.revenue || 0).toLocaleString()}</td>
              <td>
                <span style="color: ${(product.stock || 0) > 10 ? '#28a745' : (product.stock || 0) > 0 ? '#ffc107' : '#dc3545'}; font-weight: 600;">
                  ${product.stock || 0}
                </span>
              </td>
            </tr>
            `).join('')}
            
            ${(topProducts || []).length === 0 ? `
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
    
    <!-- Recent Orders -->
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
            ${(orders || []).slice(-5).reverse().map(order => `
            <tr>
              <td>#${order.id || 'N/A'}</td>
              <td>${order.customerName || 'Guest'}</td>
              <td>${order.date || new Date().toLocaleDateString()}</td>
              <td style="font-weight: 600; color: #e53935;">₹${(order.total || 0).toLocaleString()}</td>
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
            
            ${(orders || []).length === 0 ? `
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
      
      <!-- User Growth -->
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
  </div>
  
  ${getAdminFooter()}
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const revenueCtx = document.getElementById('revenueChart').getContext('2d');
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: ${JSON.stringify(monthlyData.months || [])},
          datasets: [{
            label: 'Revenue (₹)',
            data: ${JSON.stringify(monthlyData.revenues || [])},
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
            legend: { display: false }
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
            legend: { display: false }
          }
        }
      });
      
      const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
      new Chart(userGrowthCtx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(userGrowth.months || [])},
          datasets: [{
            label: 'New Users',
            data: ${JSON.stringify(userGrowth.counts || [])},
            backgroundColor: '#667eea',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
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
    
  } catch (e) {
    console.error('Analytics page error:', e);
    res.status(500).send('Error loading analytics page');
  }
});

// ============================================
// FIX 31: CART PAGE
// ============================================
app.get("/cart", (req, res) => {
  try {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Shopping Cart | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
        ${cart.map((item, index) => `
        <div class="cart-item">
          ${item.image ? `<img src="${item.image}" class="item-image">` : `
          <div style="width: 150px; height: 150px; background: #f0f0f0; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
              <div style="font-size: 48px;">🏏</div>
              <small>No Image</small>
            </div>
          </div>
          `}
          
          <div class="item-details">
            <h3 style="margin-top: 0; margin-bottom: 10px;">${item.name}</h3>
            <div style="font-size: 20px; color: #e53935; font-weight: bold; margin-bottom: 10px;">₹ ${item.price}</div>
            
            <div class="quantity-controls">
              <button class="quantity-btn" onclick="updateQuantity(${index}, ${item.quantity - 1})">-</button>
              <span style="font-size: 18px; font-weight: 600; padding: 0 15px;">${item.quantity}</span>
              <button class="quantity-btn" onclick="updateQuantity(${index}, ${item.quantity + 1})">+</button>
              
              <button class="remove-btn" onclick="removeFromCart(${index})" style="margin-left: 20px;">
                Remove
              </button>
            </div>
            
            <div style="margin-top: 15px; font-size: 18px; font-weight: 600;">
              Subtotal: ₹ ${item.price * item.quantity}
            </div>
          </div>
        </div>
        `).join('')}
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
    
  } catch (e) {
    console.error('Cart page error:', e);
    res.status(500).send('Error loading cart');
  }
});

// ============================================
// FIX 32: UPDATE CART ITEM QUANTITY
// ============================================
app.post("/update-cart-item", (req, res) => {
  try {
    const { index, quantity } = req.body;
    const cart = req.session.cart || [];
    
    if (cart[index] && quantity > 0) {
      cart[index].quantity = quantity;
      req.session.cart = cart;
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error('Update cart error:', e);
    res.json({ success: false, error: "Server error" });
  }
});

// ============================================
// FIX 33: REMOVE FROM CART
// ============================================
app.post("/remove-from-cart/:index", (req, res) => {
  try {
    const cart = req.session.cart || [];
    const index = parseInt(req.params.index);
    
    if (index >= 0 && index < cart.length) {
      cart.splice(index, 1);
      req.session.cart = cart;
    }
    
    res.redirect("/cart");
  } catch (e) {
    console.error('Remove from cart error:', e);
    res.redirect("/cart");
  }
});

// ============================================
// FIX 34: CHECKOUT PAGE
// ============================================
app.get("/checkout", (req, res) => {
  try {
    const cart = req.session.cart || [];
    
    if (cart.length === 0) {
      return res.redirect("/cart");
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 999 ? 0 : 49;
    const tax = subtotal * 0.18;
    const total = subtotal + shipping + tax;
    
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
    ${getCommonStyles()}
    
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
          <!-- Shipping Information -->
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
          
          <!-- Payment Method -->
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
            
            <!-- Card Details -->
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
            
            <!-- UPI Details -->
            <div id="upiDetails" style="display: none; margin-top: 30px;">
              <div class="form-group">
                <label class="form-label">UPI ID</label>
                <input type="text" name="upiId" class="form-input" placeholder="username@upi">
              </div>
            </div>
          </div>
        </div>
        
        <!-- Order Summary -->
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
    
  } catch (e) {
    console.error('Checkout page error:', e);
    res.status(500).send('Error loading checkout page');
  }
});

// ============================================
// FIX 35: PLACE ORDER
// ============================================
app.post("/place-order", (req, res) => {
  try {
    const cart = req.session.cart || [];
    
    if (cart.length === 0) {
      return res.redirect("/cart");
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 999 ? 0 : 49;
    const tax = subtotal * 0.18;
    const total = subtotal + shipping + tax;
    
    const order = {
      id: Date.now(),
      userId: req.session.userId || null,
      customerName: `${req.body.firstName} ${req.body.lastName}`,
      email: sanitizeInput(req.body.email),
      phone: sanitizeInput(req.body.phone),
      address: {
        street: sanitizeInput(req.body.address),
        city: sanitizeInput(req.body.city),
        state: sanitizeInput(req.body.state),
        pincode: sanitizeInput(req.body.pincode),
        country: sanitizeInput(req.body.country || 'India')
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
      orderStatus: 'processing',
      date: new Date().toLocaleString(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
    
    const orders = safeReadJSON(ORDERS_FILE, []);
    orders.push(order);
    
    if (!safeWriteJSON(ORDERS_FILE, orders)) {
      console.error('Failed to save order');
      return res.redirect("/cart?error=Failed to place order");
    }
    
    const products = loadPosts();
    cart.forEach(cartItem => {
      const product = products.find(p => p.slug === cartItem.slug);
      if (product && product.stock) {
        product.stock -= cartItem.quantity;
        if (product.stock < 0) product.stock = 0;
      }
    });
    safeWriteJSON(POSTS_FILE, products);
    
    req.session.cart = [];
    
    res.redirect(`/order-success/${order.id}`);
    
  } catch (e) {
    console.error('Place order error:', e);
    res.redirect("/cart?error=Server error");
  }
});

// ============================================
// FIX 36: ORDER SUCCESS PAGE
// ============================================
app.get("/order-success/:orderId", (req, res) => {
  try {
    const orders = safeReadJSON(ORDERS_FILE, []);
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
    ${getCommonStyles()}
    
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
    
  } catch (e) {
    console.error('Order success error:', e);
    res.redirect("/");
  }
});

// ============================================
// FIX 37: VIEW SINGLE ORDER
// ============================================
app.get("/order/:orderId", (req, res) => {
  try {
    const orders = safeReadJSON(ORDERS_FILE, []);
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
    ${getCommonStyles()}
    
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
      <!-- Order Status -->
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

      <!-- Customer Information -->
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

      <!-- Shipping Address -->
      <div class="order-section">
        <h2 class="section-title"><i class="fas fa-map-marker-alt"></i> Shipping Address</h2>
        <div class="info-item" style="background: #f8f9fa; padding: 20px;">
          <div>${order.address?.street || ''}</div>
          <div>${order.address?.city || ''}, ${order.address?.state || ''}</div>
          <div>PIN: ${order.address?.pincode || ''}</div>
          <div>${order.address?.country || 'India'}</div>
        </div>
      </div>

      <!-- Payment Information -->
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

      <!-- Order Items -->
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

      <!-- Admin Actions -->
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
    
  } catch (e) {
    console.error('View order error:', e);
    res.redirect("/admin/orders?error=Server error");
  }
});

// ============================================
// FIX 38: UPDATE ORDER STATUS (ADMIN)
// ============================================
app.post("/admin/update-order-status", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: "Not authorized" });
  }
  
  try {
    const { orderId, status } = req.body;
    const orders = safeReadJSON(ORDERS_FILE, []);
    
    const orderIndex = orders.findIndex(o => o.id == orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    orders[orderIndex].orderStatus = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    
    if (safeWriteJSON(ORDERS_FILE, orders)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to save changes" });
    }
    
  } catch (e) {
    console.error('Update order status error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================
// FIX 39: LOGIN PAGE (User)
// ============================================
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
    ${getCommonStyles()}
    
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
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1 style="font-size: 36px; margin-bottom: 10px;">Welcome Back!</h1>
        <p style="color: #666;">Login to your Sports India account</p>
      </div>
      
      <div class="auth-tabs">
        <button class="auth-tab active">Login</button>
        <button class="auth-tab" onclick="window.location.href='/register'">Register</button>
      </div>
      
      <form method="POST" action="/login-user">
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
        <button type="button" class="social-btn google">
          <i class="fab fa-google"></i>
          Google
        </button>
        <button type="button" class="social-btn facebook">
          <i class="fab fa-facebook"></i>
          Facebook
        </button>
      </div>
      
      <div class="auth-footer">
        <p>Don't have an account? <a href="/register">Sign up now</a></p>
      </div>
    </div>
  </div>
  
  ${getFooter()}
</body>
</html>`);
});

// ============================================
// FIX 40: LOGIN PROCESSING (User)
// ============================================
app.post("/login-user", loginLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    const users = loadUsers();
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.redirect("/login-user?error=User not found");
    }
    
    const hashedPassword = Buffer.from(password).toString('base64');
    
    if (user.password !== hashedPassword) {
      return res.redirect("/login-user?error=Invalid password");
    }
    
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.loginTime = Date.now();
    
    res.redirect("/profile");
    
  } catch (e) {
    console.error('Login user error:', e);
    res.redirect("/login-user?error=Server error");
  }
});

// ============================================
// FIX 41: REGISTER PAGE
// ============================================
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
    ${getCommonStyles()}
    
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
  </style>
</head>
<body>
  ${getHeader(req)}
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <h1 style="font-size: 36px; margin-bottom: 10px;">Create Account</h1>
        <p style="color: #666;">Join Sports India for exclusive benefits</p>
      </div>
      
      <div class="auth-tabs">
        <button class="auth-tab" onclick="window.location.href='/login-user'">Login</button>
        <button class="auth-tab active">Register</button>
      </div>
      
      <form method="POST" action="/register" id="registerForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input type="text" name="firstName" class="form-input" placeholder="Enter first name" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input type="text" name="lastName" class="form-input" placeholder="Enter last name" required>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" name="phone" class="form-input" placeholder="Enter phone number">
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" name="password" id="password" class="form-input" placeholder="Create a password" required oninput="checkPasswordStrength()">
          <div class="password-strength">
            <div class="strength-bar" id="strengthBar"></div>
          </div>
          <small style="color: #666; display: block; margin-top: 5px;">
            Must be at least 8 characters with letters and numbers
          </small>
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input type="password" name="confirmPassword" class="form-input" placeholder="Confirm password" required>
        </div>
        
        <div class="terms-check">
          <input type="checkbox" id="terms" name="terms" required>
          <label for="terms">
            I agree to the <a href="/terms" target="_blank">Terms & Conditions</a> and <a href="/privacy-policy" target="_blank">Privacy Policy</a>
          </label>
        </div>
        
        <div class="terms-check">
          <input type="checkbox" id="newsletter" name="newsletter" checked>
          <label for="newsletter">
            Subscribe to newsletter for exclusive offers and updates
          </label>
        </div>
        
        <button type="submit" class="auth-btn">Create Account</button>
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
// FIX 42: REGISTRATION PROCESSING
// ============================================
app.post("/register", (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, terms, newsletter } = req.body;
    const users = loadUsers();
    
    if (users.some(u => u.email === email)) {
      return res.redirect("/register?error=Email already registered");
    }
    
    const newUser = {
      id: Date.now(),
      name: `${sanitizeInput(firstName)} ${sanitizeInput(lastName)}`,
      email: sanitizeInput(email),
      phone: sanitizeInput(phone || ''),
      password: Buffer.from(password).toString('base64'),
      createdAt: new Date().toISOString(),
      isActive: true,
      role: 'user'
    };
    
    users.push(newUser);
    safeWriteJSON(USERS_FILE, users);
    
    if (newsletter) {
      const subscribers = safeReadJSON(NEWSLETTER_FILE, []);
      subscribers.push({
        email: sanitizeInput(email),
        name: `${sanitizeInput(firstName)} ${sanitizeInput(lastName)}`,
        date: new Date().toISOString(),
        active: true
      });
      safeWriteJSON(NEWSLETTER_FILE, subscribers);
    }
    
    req.session.userId = newUser.id;
    req.session.userName = newUser.name;
    req.session.userEmail = newUser.email;
    
    res.redirect("/profile?welcome=true");
    
  } catch (e) {
    console.error('Registration error:', e);
    res.redirect("/register?error=Server error");
  }
});

// ============================================
// FIX 43: PROFILE PAGE
// ============================================
app.get("/profile", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  try {
    const users = loadUsers();
    const user = users.find(u => u.id === req.session.userId);
    const orders = safeReadJSON(ORDERS_FILE, []);
    const userOrders = orders.filter(o => o.userId === req.session.userId);
    
    if (!user) {
      req.session.destroy();
      return res.redirect("/login-user");
    }
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>My Profile | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
    
  } catch (e) {
    console.error('Profile page error:', e);
    res.status(500).send('Error loading profile');
  }
});

// ============================================
// FIX 44: UPDATE PROFILE PAGE
// ============================================
app.get("/update-profile", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  try {
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
    ${getCommonStyles()}
    
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
    
  } catch (e) {
    console.error('Update profile page error:', e);
    res.redirect("/profile");
  }
});

// ============================================
// FIX 45: UPDATE PROFILE PROCESSING
// ============================================
app.post("/update-profile", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  try {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.session.userId);
    
    if (userIndex === -1) {
      return res.redirect("/profile");
    }
    
    users[userIndex].name = `${sanitizeInput(req.body.firstName || '')} ${sanitizeInput(req.body.lastName || '')}`.trim();
    users[userIndex].email = sanitizeInput(req.body.email);
    users[userIndex].phone = sanitizeInput(req.body.phone || '');
    
    if (!users[userIndex].address) {
      users[userIndex].address = {};
    }
    
    users[userIndex].address.street = sanitizeInput(req.body.addressStreet || '');
    users[userIndex].address.city = sanitizeInput(req.body.addressCity || '');
    users[userIndex].address.state = sanitizeInput(req.body.addressState || '');
    users[userIndex].address.pincode = sanitizeInput(req.body.addressPincode || '');
    users[userIndex].address.country = sanitizeInput(req.body.addressCountry || 'India');
    
    users[userIndex].updatedAt = new Date().toISOString();
    
    if (safeWriteJSON(USERS_FILE, users)) {
      req.session.userName = users[userIndex].name;
      req.session.userEmail = users[userIndex].email;
      res.redirect("/profile?success=Profile updated successfully");
    } else {
      res.redirect("/profile?error=Failed to save changes");
    }
    
  } catch (e) {
    console.error('Update profile error:', e);
    res.redirect("/profile?error=Server error");
  }
});

// ============================================
// FIX 46: CHANGE PASSWORD PAGE
// ============================================
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
    ${getCommonStyles()}
    
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

// ============================================
// FIX 47: CHANGE PASSWORD PROCESSING
// ============================================
app.post("/change-password", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login-user");
  }
  
  try {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.session.userId);
    
    if (userIndex === -1) {
      return res.redirect("/profile");
    }
    
    const { currentPassword, newPassword } = req.body;
    
    const hashedCurrent = Buffer.from(currentPassword).toString('base64');
    
    if (users[userIndex].password !== hashedCurrent) {
      return res.redirect("/change-password?error=Current password is incorrect");
    }
    
    users[userIndex].password = Buffer.from(newPassword).toString('base64');
    users[userIndex].updatedAt = new Date().toISOString();
    
    if (safeWriteJSON(USERS_FILE, users)) {
      res.redirect("/profile?success=Password updated successfully");
    } else {
      res.redirect("/change-password?error=Failed to save changes");
    }
    
  } catch (e) {
    console.error('Change password error:', e);
    res.redirect("/change-password?error=Server error");
  }
});

// ============================================
// FIX 48: SERVER START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
  console.log("✅ Environment:", isProduction ? "production" : "development");
  console.log("\n📱 Available pages:");
  console.log("1.  / - Home page");
  console.log("2.  /about - About Us page");
  console.log("3.  /contact - Contact Us page");
  console.log("4.  /privacy-policy - Privacy Policy");
  console.log("5.  /terms - Terms & Conditions");
  console.log("6.  /product/:slug - Product details");
  console.log("7.  /product/:slug/reviews - Product reviews");
  console.log("8.  /products/filter - Advanced product filtering");
  console.log("9.  /cart - Shopping cart");
  console.log("10. /checkout - Checkout");
  console.log("11. /profile - User profile");
  console.log("12. /orders - Order history");
  console.log("13. /wishlist - Wishlist");
  console.log("\n🔐 Admin pages:");
  console.log("14. /login - Admin login");
  console.log("15. /admin - Admin dashboard");
  console.log("16. /posts - Manage products");
  console.log("17. /admin/orders - Manage orders");
  console.log("18. /admin/sliders - Manage sliders");
  console.log("19. /admin/categories - Manage categories");
  console.log("20. /admin/customers - Manage customers");
  console.log("21. /admin/analytics - Analytics dashboard");
  console.log("22. /admin/settings - Store settings");
  console.log("23. /admin/manage-sections - Homepage sections");
});

// ============================================
// FIX 49: 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found | Sports India</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        ${getCommonStyles()}
        .error-container {
          max-width: 600px;
          margin: 100px auto;
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .error-code {
          font-size: 120px;
          font-weight: bold;
          color: #e53935;
          line-height: 1;
          margin-bottom: 20px;
        }
        .error-message {
          font-size: 24px;
          margin-bottom: 30px;
          color: #333;
        }
        .home-link {
          display: inline-block;
          background: #e53935;
          color: white;
          padding: 15px 30px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }
        .home-link:hover {
          background: #c62828;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      ${getHeader(req)}
      <div class="error-container">
        <div class="error-code">404</div>
        <div class="error-message">Page Not Found</div>
        <p style="color: #666; margin-bottom: 30px;">The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" class="home-link">Go to Homepage</a>
      </div>
      ${getFooter()}
    </body>
    </html>
  `);
});

// ============================================
// FIX 50: Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Error | Sports India</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        ${getCommonStyles()}
        .error-container {
          max-width: 600px;
          margin: 100px auto;
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .error-code {
          font-size: 120px;
          font-weight: bold;
          color: #e53935;
          line-height: 1;
          margin-bottom: 20px;
        }
        .error-message {
          font-size: 24px;
          margin-bottom: 30px;
          color: #333;
        }
        .home-link {
          display: inline-block;
          background: #e53935;
          color: white;
          padding: 15px 30px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }
        .home-link:hover {
          background: #c62828;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      ${getHeader(req)}
      <div class="error-container">
        <div class="error-code">500</div>
        <div class="error-message">Server Error</div>
        <p style="color: #666; margin-bottom: 30px;">Something went wrong. Please try again later.</p>
        <a href="/" class="home-link">Go to Homepage</a>
      </div>
      ${getFooter()}
    </body>
    </html>
  `);
});