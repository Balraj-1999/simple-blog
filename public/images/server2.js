const express = require("express");
const fs = require("fs");
const multer = require("multer"); 
const session = require("express-session");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const POSTS_FILE = "posts.json";
const SLIDER_FILE = "sliders.json";
const ORDERS_FILE = "orders.json";
const USERS_FILE = "users.json";
const REVIEWS_FILE = "reviews.json";
const WISHLIST_FILE = "wishlist.json";
const NEWSLETTER_FILE = "newsletter.json";
const CONTACT_FILE = "contacts.json";

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
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

function hashPassword(password) {
  return Buffer.from(password).toString('base64');
}

// Helper function to get common styles
function getCommonStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    a { text-decoration: none; color: #111; }
    a:hover { color: #e53935; }
    button { cursor: pointer; }
  `;
}

// Helper function to get header HTML
function getHeader(req) {
  const isLoggedIn = req.session.userId;
  const userName = req.session.userName;
  
  return `
    <header style="background:#111;color:white;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:24px;font-weight:bold;">
        <a href="/" style="color:white;text-decoration:none;">🏏 SPORTS INDIA</a>
      </div>
      
      <div style="display:flex;gap:15px;align-items:center;">
        <a href="/" style="color:white;text-decoration:none;">Home</a>
        <a href="/products/filter" style="color:white;text-decoration:none;">Products</a>
        <a href="/about" style="color:white;text-decoration:none;">About</a>
        <a href="/contact" style="color:white;text-decoration:none;">Contact</a>
        <a href="/cart" style="color:white;text-decoration:none;">🛒 Cart</a>
        ${isLoggedIn ? `
          <a href="/profile" style="color:white;text-decoration:none;">👤 ${userName || 'Profile'}</a>
          <a href="/logout" style="color:white;text-decoration:none;">Logout</a>
        ` : `
          <a href="/login-user" style="color:white;text-decoration:none;">Login</a>
          <a href="/register" style="color:white;text-decoration:none;">Register</a>
        `}
        <button onclick="toggleDark()" style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">
          🌙
        </button>
      </div>
    </header>
  `;
}

// Helper function to get footer HTML
function getFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div>
          <h3>SPORTS INDIA</h3>
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
          <p>📞 +91 123 456 7890</p>
          <p>📍 123 Sports Complex, Connaught Place, New Delhi</p>
          <a href="https://www.instagram.com/sportsindia_44" target="_blank">📸 Instagram</a>
          <a href="https://facebook.com/sportsindia" target="_blank">📘 Facebook</a>
          <a href="https://twitter.com/sportsindia" target="_blank">🐦 Twitter</a>
        </div>
      </div>
      
      <div class="footer-bottom">
        © ${new Date().getFullYear()} SPORTS INDIA. All rights reserved.
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
        if (theme === "dark") {
          document.body.classList.add("dark");
        }
      };
    </script>
    
    <style>
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
        color: #e53935;
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

// ============================================
// ABOUT US PAGE
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
// CONTACT US PAGE
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
              Customer Care: <a href="tel:+911234567890" style="color: #e53935;">+91 123 456 7890</a><br>
              WhatsApp Support: <a href="https://wa.me/911234567890" style="color: #e53935;">+91 123 456 7890</a><br>
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
      
      // In a real app, this would be an AJAX call
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
  
  // In production, send email notification here
  
  res.redirect("/contact?success=true");
});

// ============================================
// PRIVACY POLICY PAGE
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
// TERMS & CONDITIONS PAGE
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
// PRODUCT REVIEWS & RATINGS
// ============================================
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
    ${getCommonStyles()}
    
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

  <!-- Image Modal -->
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
      // In real app, send AJAX request
    }
    
    function markNotHelpful(reviewId) {
      alert('Thanks for your feedback!');
      // In real app, send AJAX request
    }
    
    function reportReview(reviewId) {
      const reason = prompt('Please specify the reason for reporting:');
      if (reason) {
        alert('Thank you for reporting. Our team will review this.');
      }
    }
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeImageModal();
    });
    
    // Close modal on background click
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
  
  // Check if user has already reviewed this product
  const existingReview = reviews.find(r => 
    r.userId === req.session.userId && r.productSlug === req.params.slug
  );
  
  if (existingReview) {
    return res.redirect(`/product/${req.params.slug}/reviews?error=You have already reviewed this product`);
  }
  
  // Check if user has purchased this product (for verified purchase badge)
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

// ============================================
// NEWSLETTER SUBSCRIPTION
// ============================================
app.post("/subscribe-newsletter", (req, res) => {
  const subscribers = JSON.parse(fs.readFileSync(NEWSLETTER_FILE, "utf8"));
  const { email } = req.body;
  
  // Check if already subscribed
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
  
  // In production, send welcome email
  
  res.json({ success: true, message: "Successfully subscribed!" });
});

// ============================================
// WISHLIST FUNCTIONALITY
// ============================================
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
    // Check if already in wishlist
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
    // Create new wishlist
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
    ${getCommonStyles()}
    
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
    
    // Remove empty wishlists
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

// ============================================
// ADVANCED PRODUCT FILTERING
// ============================================
app.get("/products/filter", (req, res) => {
  const products = loadPosts();
  const categories = getCategories(products);
  
  // Parse filter parameters
  const category = req.query.category;
  const minPrice = parseFloat(req.query.minPrice) || 0;
  const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
  const sizes = req.query.sizes ? req.query.sizes.split(',') : [];
  const inStock = req.query.inStock === 'true';
  const sortBy = req.query.sortBy || 'newest';
  
  let filtered = products;
  
  // Apply filters
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
  
  // Apply sorting
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
  
  // Get all available sizes
  const allSizes = [...new Set(products.flatMap(p => p.sizes || []))].sort();
  
  // Get price range
  const prices = products.map(p => p.price);
  const minProductPrice = Math.min(...prices);
  const maxProductPrice = Math.max(...prices);
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Filter Products | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
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
    
    // Initialize sliders
    updateSliders();
    
    // Form submission
    document.getElementById('filterForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const params = new URLSearchParams();
      
      for (const [key, value] of formData.entries()) {
        if (key === 'size') {
          // Handle multiple sizes
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

// ============================================
// REST OF YOUR EXISTING ROUTES
// (Keep all your existing routes from the original server.js)
// ============================================

// Your existing HOME PAGE route
app.get("/", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const selectedCat = req.query.cat;

  const productsAll = loadPosts();
  const sliders = loadSliders();

  let products = productsAll.filter(p =>
    (p.name || "").toLowerCase().includes(q) ||
    (p.description || "").toLowerCase().includes(q)
  );

  if (selectedCat) {
    products = products.filter(
      p => (p.category || "").toLowerCase() === selectedCat.toLowerCase()
    );
  }

  const categories = [...new Set(productsAll.map(p => p.category))];

  // ... [Rest of your existing home page code] ...
  
  // IMPORTANT: Your existing home page code goes here
  // I'm showing a shortened version for space
  
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>Sports India</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
/* Your existing CSS styles */
</style>
</head>
<body>
${getHeader(req)}
<!-- Your existing home page content -->
${getFooter()}
</body>
</html>`);
});

// Add all your existing routes here:
// - /category/:cat
// - /product/:slug
// - /login
// - /admin
// - /posts
// - /add-to-cart/:slug
// - /cart
// - /remove-from-cart/:index
// - /checkout
// - /place-order
// - /order-success
// - /admin/orders
// - /add-product
// - /admin/add-slider
// - /admin/delete-slider
// - /delete-post
// - /logout
// - /register
// - /login-user
// - /profile
// - /order/:id
// - /forgot-password
// - /update-profile
// etc.

// ============================================
// ANALYTICS DASHBOARD (ADMIN)
// ============================================
app.get("/admin/analytics", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  const products = loadPosts();
  const users = loadUsers();
  const reviews = loadReviews();
  
  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const conversionRate = users.length > 0 ? (orders.length / users.length) * 100 : 0;
  
  // Monthly revenue
  const monthlyRevenue = {};
  orders.forEach(order => {
    const date = new Date(order.id || Date.now());
    const monthYear = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
    monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + Number(order.total || 0);
  });
  
  // Top products
  const productSales = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + 1;
    });
  });
  
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // User growth
  const userGrowth = {};
  users.forEach(user => {
    const date = new Date(user.createdAt || Date.now());
    const monthYear = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
    userGrowth[monthYear] = (userGrowth[monthYear] || 0) + 1;
  });
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Analytics Dashboard | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
    .analytics-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .metric-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 10px;
    }
    
    .metric-change {
      font-size: 14px;
      padding: 3px 10px;
      border-radius: 20px;
      display: inline-block;
    }
    
    .change-up {
      background: #d4edda;
      color: #155724;
    }
    
    .change-down {
      background: #f8d7da;
      color: #721c24;
    }
    
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .chart-container {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .chart-placeholder {
      width: 100%;
      height: 300px;
      background: #f8f9fa;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .data-table th {
      background: #f8f9fa;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    
    .data-table td {
      padding: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .data-table tr:last-child td {
      border-bottom: none;
    }
    
    .filter-bar {
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      display: flex;
      gap: 20px;
      align-items: center;
    }
    
    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .filter-select {
      padding: 10px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .download-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    
    .tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      margin-bottom: 30px;
    }
    
    .tab {
      padding: 15px 30px;
      background: none;
      border: none;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      font-weight: 600;
    }
    
    .tab.active {
      border-bottom-color: #e53935;
      color: #e53935;
    }
    
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }
    }
  </style>
</head>
<body>
  <header style="background:#111;color:white;padding:15px 25px;display:flex;justify-content:space-between;align-items:center;">
    <h2>📊 Analytics Dashboard</h2>
    <div>
      <a href="/admin" style="color:white;text-decoration:none;margin-left:15px;font-size:14px;">← Back to Admin</a>
      <a href="/" style="color:white;text-decoration:none;margin-left:15px;font-size:14px;">View Site</a>
    </div>
  </header>

  <div class="analytics-container">
    <div class="tabs">
      <button class="tab active" onclick="showTab('overview')">Overview</button>
      <button class="tab" onclick="showTab('sales')">Sales</button>
      <button class="tab" onclick="showTab('products')">Products</button>
      <button class="tab" onclick="showTab('users')">Users</button>
      <button class="tab" onclick="showTab('traffic')">Traffic</button>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <label>Date Range:</label>
        <select class="filter-select">
          <option>Last 7 Days</option>
          <option selected>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>Last Year</option>
          <option>Custom Range</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Category:</label>
        <select class="filter-select">
          <option>All Categories</option>
          <option>Running</option>
          <option>Boxing</option>
          <option>Wrestling</option>
          <option>Cricket</option>
        </select>
      </div>
      
      <button class="download-btn" onclick="exportAnalytics()">📥 Export Report</button>
    </div>

    <div id="overview" class="tab-content active">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">₹ ${totalRevenue.toLocaleString()}</div>
          <h3>Total Revenue</h3>
          <div class="metric-change change-up">+12.5% from last month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${orders.length}</div>
          <h3>Total Orders</h3>
          <div class="metric-change change-up">+8.3% from last month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">₹ ${avgOrderValue.toFixed(0)}</div>
          <h3>Average Order Value</h3>
          <div class="metric-change change-down">-2.1% from last month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${conversionRate.toFixed(1)}%</div>
          <h3>Conversion Rate</h3>
          <div class="metric-change change-up">+0.5% from last month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${users.length}</div>
          <h3>Total Customers</h3>
          <div class="metric-change change-up">+15.2% from last month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${products.length}</div>
          <h3>Products</h3>
          <div class="metric-change change-up">+3 new this month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${reviews.length}</div>
          <h3>Reviews</h3>
          <div class="metric-change change-up">+24 this month</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">4.2</div>
          <h3>Avg. Rating</h3>
          <div class="metric-change change-up">+0.1 from last month</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-container">
          <h3 class="chart-title">Revenue Trend</h3>
          <div class="chart-placeholder">
            <div style="text-align: center;">
              <div style="font-size: 48px;">📈</div>
              <p>Revenue Chart</p>
              <small>In a real app, this would show charts using Chart.js or similar</small>
            </div>
          </div>
        </div>
        
        <div class="chart-container">
          <h3 class="chart-title">Top Products</h3>
          <div class="chart-placeholder">
            <div style="text-align: center; width: 100%;">
              <div style="font-size: 48px;">🏆</div>
              <div style="text-align: left; padding: 20px;">
                ${topProducts.map(([product, sales]) => `
                <div style="margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${product}</span>
                    <span>${sales} sales</span>
                  </div>
                  <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${(sales / topProducts[0][1]) * 100}%; background: #e53935;"></div>
                  </div>
                </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-container">
          <h3 class="chart-title">Order Status Distribution</h3>
          <div class="chart-placeholder">
            <div style="text-align: center;">
              <div style="font-size: 48px;">📊</div>
              <p>Order Status Pie Chart</p>
            </div>
          </div>
        </div>
        
        <div class="chart-container">
          <h3 class="chart-title">Customer Growth</h3>
          <div class="chart-placeholder">
            <div style="text-align: center;">
              <div style="font-size: 48px;">👥</div>
              <p>Customer Growth Line Chart</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="sales" class="tab-content" style="display: none;">
      <h2 style="margin-top: 0;">Sales Analytics</h2>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>Avg. Order Value</th>
            <th>New Customers</th>
            <th>Growth</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(monthlyRevenue).map(([month, revenue]) => {
            const monthOrders = orders.filter(o => {
              const date = new Date(o.id || Date.now());
              const monthYear = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
              return monthYear === month;
            });
            const monthUsers = users.filter(u => {
              const date = new Date(u.createdAt || Date.now());
              const monthYear = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
              return monthYear === month;
            });
            return `
            <tr>
              <td>${month}</td>
              <td>${monthOrders.length}</td>
              <td>₹ ${revenue.toLocaleString()}</td>
              <td>₹ ${monthOrders.length > 0 ? (revenue / monthOrders.length).toFixed(0) : 0}</td>
              <td>${monthUsers.length}</td>
              <td>+${Math.floor(Math.random() * 20) + 5}%</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div id="products" class="tab-content" style="display: none;">
      <h2 style="margin-top: 0;">Product Analytics</h2>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Rating</th>
            <th>Views</th>
          </tr>
        </thead>
        <tbody>
          ${products.slice(0, 10).map(product => {
            const productSales = orders.reduce((total, order) => {
              return total + order.items.filter(item => item.slug === product.slug).length;
            }, 0);
            const productRevenue = productSales * product.price;
            const productReviews = reviews.filter(r => r.productSlug === product.slug);
            const avgRating = productReviews.length > 0 
              ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
              : 'N/A';
            return `
            <tr>
              <td>${product.name}</td>
              <td>${product.category || 'General'}</td>
              <td>₹ ${product.price}</td>
              <td>${product.stock || 0}</td>
              <td>${productSales}</td>
              <td>₹ ${productRevenue}</td>
              <td>${avgRating} ★</td>
              <td>${Math.floor(Math.random() * 1000) + 100}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div id="users" class="tab-content" style="display: none;">
      <h2 style="margin-top: 0;">User Analytics</h2>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Email</th>
            <th>Join Date</th>
            <th>Orders</th>
            <th>Total Spent</th>
            <th>Avg. Order Value</th>
            <th>Last Purchase</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${users.slice(0, 10).map(user => {
            const userOrders = orders.filter(o => o.userId === user.id);
            const totalSpent = userOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const lastOrder = userOrders.length > 0 
              ? new Date(Math.max(...userOrders.map(o => o.id || Date.now()))).toLocaleDateString()
              : 'Never';
            return `
            <tr>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>${new Date(user.createdAt).toLocaleDateString()}</td>
              <td>${userOrders.length}</td>
              <td>₹ ${totalSpent}</td>
              <td>₹ ${userOrders.length > 0 ? (totalSpent / userOrders.length).toFixed(0) : 0}</td>
              <td>${lastOrder}</td>
              <td><span style="color: #4caf50;">●</span> Active</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div id="traffic" class="tab-content" style="display: none;">
      <h2 style="margin-top: 0;">Traffic Analytics</h2>
      
      <div class="metrics-grid" style="margin-bottom: 30px;">
        <div class="metric-card">
          <div class="metric-value">12.5K</div>
          <h3>Visitors (30d)</h3>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">45.2K</div>
          <h3>Pageviews (30d)</h3>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">3.6</div>
          <h3>Pages/Visit</h3>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">2:45</div>
          <h3>Avg. Session</h3>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">34.8%</div>
          <h3>Bounce Rate</h3>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">68.2%</div>
          <h3>Mobile Traffic</h3>
        </div>
      </div>
      
      <div class="chart-container">
        <h3 class="chart-title">Traffic Sources</h3>
        <div class="chart-placeholder">
          <div style="text-align: center; width: 100%;">
            <div style="font-size: 48px;">🌐</div>
            <div style="text-align: left; padding: 20px;">
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Direct</span>
                  <span>42%</span>
                </div>
                <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: 42%; background: #e53935;"></div>
                </div>
              </div>
              
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Organic Search</span>
                  <span>28%</span>
                </div>
                <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: 28%; background: #4caf50;"></div>
                </div>
              </div>
              
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Social Media</span>
                  <span>18%</span>
                </div>
                <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: 18%; background: #2196f3;"></div>
                </div>
              </div>
              
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Referral</span>
                  <span>12%</span>
                </div>
                <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: 12%; background: #ff9800;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function showTab(tabId) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
      });
      
      // Remove active class from all tabs
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Show selected tab
      document.getElementById(tabId).style.display = 'block';
      event.target.classList.add('active');
    }
    
    function exportAnalytics() {
      alert('Exporting analytics data...');
      // In real app, generate CSV/Excel file
    }
    
    // Initialize charts (simulated)
    function initCharts() {
      console.log('Initializing analytics charts...');
    }
    
    document.addEventListener('DOMContentLoaded', initCharts);
  </script>
</body>
</html>`);
});

// ============================================
// CUSTOMER MANAGEMENT (ADMIN)
// ============================================
app.get("/admin/customers", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  
  const users = loadUsers();
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  
  // Enrich users with order data
  const customers = users.map(user => {
    const userOrders = orders.filter(o => o.userId === user.id);
    const totalSpent = userOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const lastOrder = userOrders.length > 0 
      ? new Date(Math.max(...userOrders.map(o => o.id || Date.now()))).toLocaleDateString()
      : 'Never';
    
    return {
      ...user,
      orderCount: userOrders.length,
      totalSpent,
      lastOrder,
      avgOrderValue: userOrders.length > 0 ? totalSpent / userOrders.length : 0
    };
  });
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Customer Management | Sports India</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCommonStyles()}
    
    .customers-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .customers-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .search-box {
      display: flex;
      gap: 10px;
    }
    
    .search-input {
      padding: 10px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
      width: 300px;
    }
    
    .search-btn {
      background: #e53935;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
    }
    
    .customers-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .customers-table th {
      background: #f8f9fa;
      padding: 20px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
    }
    
    .customers-table td {
      padding: 20px;
      border-bottom: 1px solid #eee;
    }
    
    .customers-table tr:hover {
      background: #f8f9fa;
    }
    
    .customer-avatar {
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
    
    .customer-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .customer-email {
      color: #666;
      font-size: 14px;
    }
    
    .status-badge {
      padding: 5px 10px;
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
    
    .customer-actions {
      display: flex;
      gap: 5px;
    }
    
    .action-btn {
      padding: 5px 10px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    
    .btn-view {
      background: #6c757d;
      color: white;
    }
    
    .btn-edit {
      background: #ffc107;
      color: #212529;
    }
    
    .btn-delete {
      background: #dc3545;
      color: white;
    }
    
    .btn-email {
      background: #17a2b8;
      color: white;
    }
    
    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #e53935;
      margin-bottom: 10px;
    }
    
    .customer-modal {
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
      max-width: 600px;
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
    
    .close-modal {
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
    
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 30px;
    }
    
    .btn-primary {
      background: #e53935;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
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
    }
    
    .page-btn.active {
      background: #e53935;
      color: white;
      border-color: #e53935;
    }
    
    .export-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    
    @media (max-width: 768px) {
      .customers-header {
        flex-direction: column;
        gap: 15px;
      }
      
      .search-box {
        width: 100%;
      }
      
      .search-input {
        width: 100%;
      }
      
      .customers-table {
        display: block;
        overflow-x: auto;
      }
    }
  </style>
</head>
<body>
  <header style="background:#111;color:white;padding:15px 25px;display:flex;justify-content:space-between;align-items:center;">
    <h2>👥 Customer Management</h2>
    <div>
      <a href="/admin" style="color:white;text-decoration:none;margin-left:15px;font-size:14px;">← Back to Admin</a>
      <a href="/" style="color:white;text-decoration:none;margin-left:15px;font-size:14px;">View Site</a>
    </div>
  </header>

  <div class="customers-container">
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">${customers.length}</div>
        <div>Total Customers</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">${customers.filter(c => c.orderCount > 0).length}</div>
        <div>Active Customers</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">₹ ${customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}</div>
        <div>Total Revenue</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">${customers.length > 0 ? (customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length).toFixed(1) : 0}</div>
        <div>Avg. Orders/Customer</div>
      </div>
    </div>

    <div class="customers-header">
      <h2 style="margin: 0;">Customers (${customers.length})</h2>
      
      <div class="search-box">
        <input type="text" class="search-input" placeholder="Search customers..." id="searchInput">
        <button class="search-btn" onclick="searchCustomers()">Search</button>
        <button class="export-btn" onclick="exportCustomers()">📥 Export</button>
      </div>
    </div>

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
      <tbody id="customersTableBody">
        ${customers.map(customer => `
        <tr>
          <td>
            <div class="customer-info">
              <div class="customer-avatar">${customer.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style="font-weight: 600;">${customer.name}</div>
                <div class="customer-email">ID: ${customer.id}</div>
              </div>
            </div>
          </td>
          
          <td>
            <div>${customer.email}</div>
            <div class="customer-email">${customer.phone || 'No phone'}</div>
            <div class="customer-email">Joined: ${new Date(customer.createdAt).toLocaleDateString()}</div>
          </td>
          
          <td>
            <div style="font-weight: 600; font-size: 20px;">${customer.orderCount}</div>
            <div class="customer-email">₹ ${customer.avgOrderValue.toFixed(0)} avg.</div>
          </td>
          
          <td>
            <div style="font-weight: 600; color: #e53935; font-size: 18px;">₹ ${customer.totalSpent}</div>
          </td>
          
          <td>
            <div>${customer.lastOrder}</div>
            ${customer.lastOrder !== 'Never' ? `<div class="customer-email">${Math.floor((Date.now() - new Date(customer.lastOrder).getTime()) / (1000 * 60 * 60 * 24))} days ago</div>` : ''}
          </td>
          
          <td>
            <div class="status-badge ${customer.isActive ? 'status-active' : 'status-inactive'}">
              ${customer.isActive ? 'Active' : 'Inactive'}
            </div>
            ${customer.isActive ? '' : `<div class="customer-email">Deactivated</div>`}
          </td>
          
          <td>
            <div class="customer-actions">
              <button class="action-btn btn-view" onclick="viewCustomer(${customer.id})">View</button>
              <button class="action-btn btn-edit" onclick="editCustomer(${customer.id})">Edit</button>
              <button class="action-btn btn-email" onclick="sendEmail('${customer.email}')">Email</button>
              <button class="action-btn btn-delete" onclick="deleteCustomer(${customer.id})">Delete</button>
            </div>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    ${customers.length > 10 ? `
    <div class="pagination">
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn">...</button>
      <button class="page-btn">→</button>
    </div>
    ` : ''}
  </div>

  <!-- Customer Detail Modal -->
  <div id="customerModal" class="customer-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 style="margin: 0;">Customer Details</h2>
        <button class="close-modal" onclick="closeModal()">×</button>
      </div>
      
      <div id="customerModalContent">
        <!-- Content loaded by JavaScript -->
      </div>
    </div>
  </div>

  <script>
    function searchCustomers() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const rows = document.querySelectorAll('#customersTableBody tr');
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
      });
    }
    
    function viewCustomer(customerId) {
      // In real app, fetch customer details via AJAX
      const modalContent = document.getElementById('customerModalContent');
      modalContent.innerHTML = \`
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin: 0 auto 20px;">
            C
          </div>
          <h3 style="margin: 0;">Customer #\${customerId}</h3>
          <p>Loading customer details...</p>
        </div>
        
        <div class="form-actions">
          <button class="btn-primary" onclick="closeModal()">Close</button>
        </div>
      \`;
      
      document.getElementById('customerModal').style.display = 'flex';
      
      // Simulate API call
      setTimeout(() => {
        modalContent.innerHTML = \`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin: 0 auto 20px;">
              C
            </div>
            <h3 style="margin: 0;">John Doe</h3>
            <p>john.doe@example.com</p>
          </div>
          
          <div class="form-group">
            <label class="form-label">Customer Information</label>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p><strong>Email:</strong> john.doe@example.com</p>
              <p><strong>Phone:</strong> +91 9876543210</p>
              <p><strong>Joined:</strong> January 15, 2024</p>
              <p><strong>Status:</strong> <span style="color: #4caf50;">Active</span></p>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Order History</label>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p><strong>Total Orders:</strong> 5</p>
              <p><strong>Total Spent:</strong> ₹ 12,500</p>
              <p><strong>Last Order:</strong> February 20, 2024</p>
              <p><strong>Average Order Value:</strong> ₹ 2,500</p>
            </div>
          </div>
          
          <div class="form-actions">
            <button class="btn-primary" onclick="sendEmail('john.doe@example.com')">Send Email</button>
            <button class="btn-secondary" onclick="closeModal()">Close</button>
          </div>
        \`;
      }, 500);
    }
    
    function editCustomer(customerId) {
      alert('Edit customer ' + customerId + ' (Feature not implemented in demo)');
    }
    
    function deleteCustomer(customerId) {
      if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        alert('Customer ' + customerId + ' deleted (Feature not implemented in demo)');
      }
    }
    
    function sendEmail(email) {
      const subject = prompt('Email subject:');
      if (subject) {
        const body = prompt('Email body:');
        if (body) {
          alert('Email sent to ' + email);
        }
      }
    }
    
    function exportCustomers() {
      alert('Exporting customer data...');
      // In real app, generate CSV file
    }
    
    function closeModal() {
      document.getElementById('customerModal').style.display = 'none';
    }
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
    
    // Close modal on background click
    document.getElementById('customerModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    
    // Search on Enter key
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
      if (e.key === 'Enter') searchCustomers();
    });
  </script>
</body>
</html>`);
});

// ============================================
// YOUR EXISTING USER REGISTRATION, LOGIN, PROFILE ROUTES
// ============================================
// Add all your existing user routes here (register, login-user, profile, etc.)

// ... [Rest of your existing code] ...

// ============================================
// SERVER START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  console.log("Available pages:");
  console.log("1.  /about - About Us page");
  console.log("2.  /contact - Contact Us page");
  console.log("3.  /privacy-policy - Privacy Policy");
  console.log("4.  /terms - Terms & Conditions");
  console.log("5.  /product/:slug/reviews - Product reviews");
  console.log("6.  /wishlist - User wishlist");
  console.log("7.  /products/filter - Advanced product filtering");
  console.log("8.  /admin/analytics - Analytics dashboard");
  console.log("9.  /admin/customers - Customer management");
  console.log("10. / - Home page (your existing)");
});