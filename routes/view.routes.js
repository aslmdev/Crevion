// ============================================
// 📁 routes/view.routes.js
// ============================================
const express = require('express');
const router = express.Router();

// Home Route
router.get("/", (req, res) => {
    res.render("index", {
        title: "Home - Crevion",
        user: req.session.user || null
    });
});

// Dashboard Route
router.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    
    res.render("dashboard", {
        title: "Dashboard - Crevion",
        user: req.session.user
    });
});

// Settings Route
router.get("/settings", (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    
    res.render("settings", {
        title: "Settings - Crevion",
        user: req.session.user
    });
});

module.exports = router;
