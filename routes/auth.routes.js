// ============================================
// 📁 routes/auth.routes.js 
// ============================================
const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const { getDB } = require('../config/database');

const router = express.Router();

// ✅ CRITICAL FIX: Load environment variables
require('dotenv').config();

// Discord OAuth Callback
router.get('/discord', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        console.log('❌ No code provided in callback');
        return res.redirect('/');
    }

    try {
        // ✅ FIX 1: Read from process.env directly with fallback
        const CLIENT_ID = process.env.CLIENT_ID || '1416879488855445536';
        const CLIENT_SECRET = process.env.CLIENT_SECRET;
        const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

        // ✅ FIX 2: Debug logging
        console.log('🔍 Debug Info:');
        console.log('  - CLIENT_ID exists:', !!CLIENT_ID);
        console.log('  - CLIENT_ID value:', CLIENT_ID);
        console.log('  - CLIENT_SECRET exists:', !!CLIENT_SECRET);
        console.log('  - BASE_URL:', BASE_URL);

        // ✅ FIX 3: Strict validation
        if (!CLIENT_SECRET || CLIENT_SECRET === 'YOUR_DISCORD_CLIENT_SECRET_HERE') {
            console.error('❌ CLIENT_SECRET is missing or not set properly!');
            return res.status(500).send(`
                <h1>Discord OAuth Configuration Error</h1>
                <p>CLIENT_SECRET is not configured properly in .env file</p>
                <p>Please check your .env file and make sure CLIENT_SECRET is set</p>
                <a href="/">Go Home</a>
            `);
        }

        console.log('✅ All credentials validated, proceeding with OAuth...');

        // Get Discord Access Token
        const tokenRes = await axios.post(
            "https://discord.com/api/oauth2/token",
            qs.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: "authorization_code",
                redirect_uri: `${BASE_URL}/auth/discord`,
                code: code,
                scope: "identify email"
            }),
            { 
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded" 
                },
                timeout: 10000
            }
        );

        console.log('✅ Got access token from Discord');

        const accessToken = tokenRes.data.access_token;

        // Get Discord User Data
        const userData = await axios.get(
            "https://discord.com/api/users/@me",
            { 
                headers: { 
                    Authorization: `Bearer ${accessToken}` 
                },
                timeout: 10000
            }
        );

        const discordUser = userData.data;
        console.log('👤 Discord User:', discordUser.username, '(ID:', discordUser.id + ')');
        
        const db = getDB();
        
        // Clean username
        const cleanUsername = discordUser.username
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9._-]/g, '');
        
        console.log('🔧 Cleaned username:', cleanUsername);

        let user = await db.collection('users').findOne({ discordId: discordUser.id });

        if (!user) {
            // Create new user
            console.log('📝 Creating new user...');
            
            const newUser = {
                discordId: discordUser.id,
                username: cleanUsername,
                discordUsername: discordUser.username,
                discordGlobalName: discordUser.global_name || discordUser.username,
                avatar: discordUser.avatar,
                email: discordUser.email || null,
                bio: "مبدع في Crevion 🚀",
                customDisplayName: null,
                location: null,
                website: null,
                socialLinks: {
                    twitter: null,
                    instagram: null,
                    github: null,
                    behance: null,
                    dribbble: null
                },
                skills: [],
                customTheme: {
                    coverImage: null,
                    coverGradient: 'linear-gradient(135deg, #370080, #7C3AED, #C026D3)',
                    accentColor: '#7C3AED',
                    secondaryColor: '#C026D3'
                },
                profileSections: {
                    showAbout: true,
                    showProjects: true,
                    showActivity: true,
                    showStats: true,
                    showBadges: true,
                    showSkills: true
                },
                stats: {
                    projects: 0,
                    followers: 0,
                    following: 0,
                    likes: 0,
                    views: 0
                },
                badges: [],
                isPro: false,
                createdAt: new Date(),
                lastLogin: new Date()
            };

            const result = await db.collection('users').insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
            
            console.log('✅ New user created successfully:', cleanUsername);
        } else {
            // Update existing user
            console.log('🔄 Updating existing user...');
            
            await db.collection('users').updateOne(
                { discordId: discordUser.id },
                { 
                    $set: { 
                        lastLogin: new Date(),
                        discordUsername: discordUser.username,
                        discordGlobalName: discordUser.global_name || discordUser.username,
                        avatar: discordUser.avatar,
                        email: discordUser.email || user.email
                    } 
                }
            );
            
            console.log('✅ User updated successfully:', user.username);
        }

        // Create Session
        const displayName = user.customDisplayName || user.discordGlobalName || user.discordUsername || user.username;

        req.session.user = {
            id: user.discordId,
            discordId: user.discordId,
            username: user.username,
            displayName: displayName,
            avatar: user.avatar,
            avatarURL: user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                : 'https://cdn.discordapp.com/embed/avatars/0.png',
            isPro: user.isPro || false
        };

        req.session.save((err) => {
            if (err) {
                console.error('❌ Session Save Error:', err);
                return res.status(500).send("Failed to save session");
            }
            
            console.log('🎉 Login successful! Session saved.');
            console.log('🔀 Redirecting to profile:', `/@${user.username}`);
            
            // Redirect to profile
            res.redirect(`/@${user.username}`);
        });

    } catch (err) {
        console.error('❌ Full Auth Error:');
        console.error('  Error Message:', err.message);
        
        if (err.response) {
            console.error('  Response Status:', err.response.status);
            console.error('  Response Data:', JSON.stringify(err.response.data, null, 2));
        }
        
        if (err.code) {
            console.error('  Error Code:', err.code);
        }
        
        // User-friendly error page
        return res.status(500).send(`
            <html>
            <head>
                <title>خطأ في تسجيل الدخول</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: #0a0a14;
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        direction: rtl;
                    }
                    .error-box {
                        background: rgba(239, 68, 68, 0.1);
                        border: 2px solid #EF4444;
                        border-radius: 16px;
                        padding: 2rem;
                        max-width: 600px;
                        text-align: center;
                    }
                    h1 { color: #EF4444; margin-bottom: 1rem; }
                    p { line-height: 1.8; margin-bottom: 1rem; }
                    .details {
                        background: rgba(0, 0, 0, 0.3);
                        padding: 1rem;
                        border-radius: 8px;
                        margin: 1rem 0;
                        font-family: monospace;
                        text-align: left;
                        font-size: 0.9rem;
                    }
                    a {
                        display: inline-block;
                        padding: 0.75rem 2rem;
                        background: #7C3AED;
                        color: #fff;
                        text-decoration: none;
                        border-radius: 8px;
                        margin-top: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="error-box">
                    <h1>❌ فشل تسجيل الدخول</h1>
                    <p>حدث خطأ أثناء محاولة تسجيل الدخول عبر Discord</p>
                    <div class="details">
                        <strong>تفاصيل الخطأ:</strong><br>
                        ${err.message}<br><br>
                        ${err.response ? `Status: ${err.response.status}<br>` : ''}
                        ${err.response ? `Discord Error: ${JSON.stringify(err.response.data)}` : ''}
                    </div>
                    <p><strong>الحلول المقترحة:</strong></p>
                    <p>
                        1. تأكد من ملف .env موجود وصحيح<br>
                        2. تأكد من CLIENT_SECRET محدث<br>
                        3. تأكد من Redirect URI صحيح في Discord Dashboard
                    </p>
                    <a href="/">العودة للرئيسية</a>
                </div>
            </body>
            </html>
        `);
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    const username = req.session.user?.username;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
        } else {
            console.log('👋 User logged out:', username);
        }
        res.redirect('/');
    });
});

module.exports = router;