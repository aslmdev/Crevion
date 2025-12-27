
// ============================================
// 📄 app.js - الملف الرئيسي
// ============================================
require('dotenv').config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const { connectDB } = require('./config/database');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const apiRoutes = require('./routes/api.routes');
const viewRoutes = require('./routes/view.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================
// View Engine Setup
// ============================================
app.set("view engine", "ejs");
app.set("views", [
    path.join(__dirname, "src", "pages"),
    path.join(__dirname, "src", "layouts"),
    path.join(__dirname, "src", "partials")
]);

// ============================================
// Middleware
// ============================================
app.use(express.static(path.join(__dirname, "public")));
app.use('/assets', express.static(path.join(__dirname, "assets")));
app.use('/style', express.static(path.join(__dirname, "style")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'crevion-super-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Request Logger
app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.path}`);
    next();
});

// ============================================
// Routes
// ============================================
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/', profileRoutes);
app.use('/', viewRoutes);

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    // إذا كان المسار يبدأ بـ @ ولكن المستخدم غير موجود
    if (req.path.startsWith('/@')) {
        return res.status(404).render("404userNotFound", {
            title: "User Not Found",
            username: req.path.substring(2),
            user: req.session.user || null
        });
    }
    
    res.status(404).render("404", {
        title: "Page Not Found",
        user: req.session.user || null
    });
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).send("Internal Server Error");
});

// ============================================
// Start Server Function
// ============================================
const startServer = async () => {
    try {
        // Connect to Database FIRST
        await connectDB();
        
        // Then start the server
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 ================================');
            console.log('🚀 Crevion Server Started!');
            console.log('🌐 URL:', process.env.BASE_URL || `http://localhost:${PORT}`);
            console.log('📦 Database: Connected');
            console.log('⚡ Status: Ready');
            console.log('🎉 ================================');
            console.log('');
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

// Start the server
startServer();

// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    const { closeDB } = require('./config/database');
    await closeDB();
    process.exit(0);
});

