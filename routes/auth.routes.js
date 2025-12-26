// ============================================
// 📁 routes/auth.routes.js
// ============================================
const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const { getDB } = require('../config/database');

const router = express.Router();

// Discord OAuth Callback
router.get('/discord', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.redirect('/');
    }

    try {
        // Get Discord Access Token
        const tokenRes = await axios.post(
            "https://discord.com/api/oauth2/token",
            qs.stringify({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: "authorization_code",
                redirect_uri: `${process.env.BASE_URL}/auth/discord`,
                code,
                scope: "identify email"
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const accessToken = tokenRes.data.access_token;

        // Get Discord User Data
        const userData = await axios.get(
            "https://discord.com/api/users/@me",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const discordUser = userData.data;
        const db = getDB();
        
        // ✅ حفظ اليوزرنيم بدون تعديل (مع النقط والأحرف الخاصة)
        // فقط تحويل لـ lowercase وإزالة المسافات
        const cleanUsername = discordUser.username.toLowerCase().replace(/\s+/g, '');
        
        let user = await db.collection('users').findOne({ discordId: discordUser.id });

        if (!user) {
            // إنشاء مستخدم جديد
            const newUser = {
                discordId: discordUser.id,
                username: cleanUsername, // ✅ محفوظ مع النقط
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
            
            console.log('✅ New user created:', cleanUsername);
        } else {
            // تحديث آخر تسجيل دخول
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
            
            console.log('✅ User logged in:', user.username);
        }

        // إنشاء الـ Session
        const displayName = user.customDisplayName || user.discordGlobalName || user.discordUsername || user.username;

        req.session.user = {
            id: user.discordId,
            discordId: user.discordId,
            username: user.username, // ✅ مع النقط
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
            
            // Redirect إلى البروفايل
            res.redirect(`/@${user.username}`);
        });

    } catch (err) {
        console.error('❌ Auth Error:', err.response?.data || err.message);
        res.status(500).send(`Login failed: ${err.message}`);
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
