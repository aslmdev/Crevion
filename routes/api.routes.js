// ============================================
// 📁 routes/api.routes.js
// ============================================
const express = require('express');
const { getDB } = require('../config/database');

const router = express.Router();

// Follow/Unfollow API
router.post('/follow/:username', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const targetUsername = req.params.username.toLowerCase();

    try {
        const db = getDB();
        const targetUser = await db.collection('users').findOne({ username: targetUsername });

        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (targetUser.discordId === req.session.user.discordId) {
            return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
        }

        const existingFollow = await db.collection('follows').findOne({
            followerId: req.session.user.discordId,
            followingId: targetUser.discordId
        });

        if (existingFollow) {
            await db.collection('follows').deleteOne({ _id: existingFollow._id });
            await db.collection('users').updateOne(
                { discordId: req.session.user.discordId },
                { $inc: { 'stats.following': -1 } }
            );
            await db.collection('users').updateOne(
                { discordId: targetUser.discordId },
                { $inc: { 'stats.followers': -1 } }
            );

            return res.json({ success: true, action: 'unfollowed' });
        } else {
            await db.collection('follows').insertOne({
                followerId: req.session.user.discordId,
                followingId: targetUser.discordId,
                createdAt: new Date()
            });

            await db.collection('users').updateOne(
                { discordId: req.session.user.discordId },
                { $inc: { 'stats.following': 1 } }
            );
            await db.collection('users').updateOne(
                { discordId: targetUser.discordId },
                { $inc: { 'stats.followers': 1 } }
            );

            return res.json({ success: true, action: 'followed' });
        }
    } catch (err) {
        console.error('❌ Follow Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

