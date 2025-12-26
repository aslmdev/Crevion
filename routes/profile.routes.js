// ============================================
// 📁 routes/profile.routes.js
// ============================================
const express = require('express');
const { getDB } = require('../config/database');

const router = express.Router();

// Profile Route - /@username
router.get('/@:username', async (req, res) => {
    // ✅ الحصول على اليوزرنيم بدون تعديل (مع النقط)
    const username = req.params.username.toLowerCase();

    try {
        const db = getDB();
        
        // ✅ البحث باليوزرنيم الكامل (مع النقط)
        const profileUser = await db.collection('users').findOne({ username });

        if (!profileUser) {
            console.log('❌ User not found:', username);
            return res.status(404).render("404userNotFound", {
                title: "User Not Found",
                username: req.params.username,
                user: req.session.user || null
            });
        }

        console.log('✅ Profile loaded:', profileUser.username);

        const isOwner = req.session.user && req.session.user.discordId === profileUser.discordId;
        
        // زيادة عدد الزيارات (إذا لم يكن المالك)
        if (!isOwner) {
            await db.collection('users').updateOne(
                { discordId: profileUser.discordId },
                { $inc: { 'stats.views': 1 } }
            );
            profileUser.stats.views = (profileUser.stats.views || 0) + 1;
        }

        // جلب المشاريع
        const projects = await db.collection('projects')
            .find({ ownerId: profileUser.discordId })
            .sort({ createdAt: -1 })
            .toArray();

        // جلب الشارات
        const userBadges = await db.collection('user_badges')
            .find({ userId: profileUser.discordId })
            .toArray();

        const badgeIds = userBadges.map(ub => ub.badgeId);
        const badges = badgeIds.length > 0
            ? await db.collection('badges').find({ _id: { $in: badgeIds } }).toArray()
            : [];

        // التحقق من المتابعة
        let isFollowing = false;
        if (req.session.user && !isOwner) {
            const followRecord = await db.collection('follows').findOne({
                followerId: req.session.user.discordId,
                followingId: profileUser.discordId
            });
            isFollowing = !!followRecord;
        }

        // الحصول على الاسم المعروض
        const displayName = profileUser.customDisplayName || profileUser.discordGlobalName || profileUser.discordUsername || profileUser.username;

        res.render("profile", {
            title: `${displayName} (@${profileUser.username}) - Crevion`,
            profileUser: {
                ...profileUser,
                displayName: displayName,
                avatarURL: profileUser.avatar
                    ? `https://cdn.discordapp.com/avatars/${profileUser.discordId}/${profileUser.avatar}.png`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png',
                badges: badges
            },
            projects,
            isOwner,
            isFollowing,
            user: req.session.user || null
        });

    } catch (err) {
        console.error('❌ Profile Error:', err);
        res.status(500).render("404", {
            title: "Server Error",
            user: req.session.user || null
        });
    }
});

// Redirect /profile to user's own profile
router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    // ✅ Redirect مع اليوزرنيم الكامل (مع النقط)
    res.redirect(`/@${req.session.user.username}`);
});

module.exports = router;
