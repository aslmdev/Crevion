// require('dotenv').config();
// const express = require("express");
// const session = require("express-session");
// const axios = require("axios");
// const qs = require("querystring");
// const path = require("path");
// const { MongoClient, ObjectId } = require('mongodb');

// const app = express();
// const PORT = 4000;

// let db;
// const client = new MongoClient(process.env.MONGODB_URI);

// async function connectDB() {
//     try {
//         await client.connect();
//         db = client.db();
//         console.log('✅ Connected to MongoDB');
//     } catch (err) {
//         console.error('❌ MongoDB Connection Error:', err);
//         process.exit(1);
//     }
// }


// connectDB();

// app.set("view engine", "ejs");
// app.set("views", [
//     path.join(__dirname, "src", "pages"),
//     path.join(__dirname, "src", "layouts"),
//     path.join(__dirname, "src", "partials")
// ]);

// app.use(express.static(path.join(__dirname, "public")));
// app.use('/assets', express.static(path.join(__dirname, "assets")));
// app.use('/style', express.static(path.join(__dirname, "style")));
// app.use(express.json());

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: false,
//         maxAge: 24 * 60 * 60 * 1000
//     }
// }));

// app.use((req, res, next) => {
//     console.log('📍', req.path);
//     next();
// });

// // Home Route
// app.get("/", (req, res) => {
//     res.render("index", {
//         title: "Home",
//         user: req.session.user || null
//     });
// });

// // Discord OAuth
// app.get("/auth/discord", async (req, res) => {
//     const code = req.query.code;

//     if (!code) return res.redirect("/");

//     try {
//         const tokenRes = await axios.post(
//             "https://discord.com/api/oauth2/token",
//             qs.stringify({
//                 client_id: process.env.DISCORD_CLIENT_ID || "1416879488855445536",
//                 client_secret: process.env.CLIENT_SECRET,
//                 grant_type: "authorization_code",
//                 redirect_uri: `${process.env.BASE_URL}/auth/discord`,
//                 code,
//                 scope: "identify email"
//             }),
//             { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );

//         const accessToken = tokenRes.data.access_token;

//         const userData = await axios.get(
//             "https://discord.com/api/users/@me",
//             { headers: { Authorization: `Bearer ${accessToken}` } }
//         );

//         const discordUser = userData.data;
//         let user = await db.collection('users').findOne({ discordId: discordUser.id });

//         if (!user) {
//             const newUser = {
//                 discordId: discordUser.id,
//                 username: discordUser.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
//                 displayName: discordUser.username,
//                 avatar: discordUser.avatar,
//                 email: discordUser.email || null,
//                 bio: "مبدع في Crevion 🚀",
//                 skills: [],
//                 customTheme: {
//                     coverGradient: 'linear-gradient(135deg, #370080, #7C3AED, #C026D3)',
//                     accentColor: '#7C3AED',
//                     secondaryColor: '#C026D3'
//                 },
//                 stats: {
//                     projects: 0,
//                     followers: 0,
//                     following: 0,
//                     likes: 0
//                 },
//                 badges: [],
//                 isPro: false,
//                 createdAt: new Date()
//             };

//             const result = await db.collection('users').insertOne(newUser);
//             user = { ...newUser, _id: result.insertedId };
//         }

//         req.session.user = {
//             id: user._id.toString(),
//             discordId: user.discordId,
//             username: user.username,
//             displayName: user.displayName || user.username,
//             avatar: user.avatar,
//             avatarURL: user.avatar
//                 ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
//                 : 'https://cdn.discordapp.com/embed/avatars/0.png',
//             isPro: user.isPro || false
//         };

//         req.session.save((err) => {
//             if (err) {
//                 console.error('❌ Session Error:', err);
//                 return res.send("Session save failed");
//             }
//             res.redirect(`/@${user.username}`);
//         });

//     } catch (err) {
//         console.error('❌ Auth Error:', err.response?.data || err.message);
//         res.send(`Login failed: ${err.message}`);
//     }
// });

// // Profile Route
// app.get("/@:username", async (req, res) => {
//     const username = req.params.username.toLowerCase();

//     try {
//         const profileUser = await db.collection('users').findOne({ username });

//         if (!profileUser) {
//             return res.status(404).render("404userNotFound", {
//                 title: "User Not Found",
//                 username: req.params.username,
//                 user: req.session.user || null
//             });
//         }

//         // Get user's projects
//         const projects = await db.collection('projects')
//             .find({ ownerId: profileUser.discordId })
//             .sort({ createdAt: -1 })
//             .limit(20)
//             .toArray();

//         // Get user's badges
//         const userBadges = await db.collection('user_badges')
//             .find({ userId: profileUser.discordId })
//             .toArray();

//         const badgeIds = userBadges.map(ub => ub.badgeId);
//         const badges = badgeIds.length > 0
//             ? await db.collection('badges').find({ _id: { $in: badgeIds } }).toArray()
//             : [];

//         // Check if viewer is owner
//         const isOwner = req.session.user && req.session.user.discordId === profileUser.discordId;

//         // Check if viewer is following
//         let isFollowing = false;
//         if (req.session.user && !isOwner) {
//             const followRecord = await db.collection('follows').findOne({
//                 followerId: req.session.user.discordId,
//                 followingId: profileUser.discordId
//             });
//             isFollowing = !!followRecord;
//         }

//         res.render("profile", {
//             title: `${profileUser.displayName || profileUser.username} - Crevion`,
//             profileUser: {
//                 ...profileUser,
//                 avatarURL: profileUser.avatar
//                     ? `https://cdn.discordapp.com/avatars/${profileUser.discordId}/${profileUser.avatar}.png`
//                     : 'https://cdn.discordapp.com/embed/avatars/0.png',
//                 badges: badges
//             },
//             projects,
//             isOwner,
//             isFollowing,
//             user: req.session.user || null
//         });

//     } catch (err) {
//         console.error('❌ Profile Error:', err);
//         res.status(500).send("Server Error");
//     }
// });

// // Follow/Unfollow API
// app.post("/api/follow/:username", async (req, res) => {
//     if (!req.session.user) {
//         return res.status(401).json({ success: false, message: 'Not authenticated' });
//     }

//     const targetUsername = req.params.username.toLowerCase();

//     try {
//         const targetUser = await db.collection('users').findOne({ username: targetUsername });

//         if (!targetUser) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         if (targetUser.discordId === req.session.user.discordId) {
//             return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
//         }

//         const existingFollow = await db.collection('follows').findOne({
//             followerId: req.session.user.discordId,
//             followingId: targetUser.discordId
//         });

//         if (existingFollow) {
//             // Unfollow
//             await db.collection('follows').deleteOne({ _id: existingFollow._id });

//             // Update stats
//             await db.collection('users').updateOne(
//                 { discordId: req.session.user.discordId },
//                 { $inc: { 'stats.following': -1 } }
//             );
//             await db.collection('users').updateOne(
//                 { discordId: targetUser.discordId },
//                 { $inc: { 'stats.followers': -1 } }
//             );

//             return res.json({ success: true, action: 'unfollowed' });
//         } else {
//             // Follow
//             await db.collection('follows').insertOne({
//                 followerId: req.session.user.discordId,
//                 followingId: targetUser.discordId,
//                 createdAt: new Date()
//             });

//             // Update stats
//             await db.collection('users').updateOne(
//                 { discordId: req.session.user.discordId },
//                 { $inc: { 'stats.following': 1 } }
//             );
//             await db.collection('users').updateOne(
//                 { discordId: targetUser.discordId },
//                 { $inc: { 'stats.followers': 1 } }
//             );

//             return res.json({ success: true, action: 'followed' });
//         }
//     } catch (err) {
//         console.error('❌ Follow Error:', err);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// });

// // Redirect /profile to user's profile
// app.get("/profile", (req, res) => {
//     if (!req.session.user) {
//         return res.redirect("/");
//     }
//     res.redirect(`/@${req.session.user.username}`);
// });

// app.get("/#features", (req, res) => {
//     res.render("index#features", {
//         title: "Features",
//         user: req.session.user || null
//     });
// });
// app.get("/#about-section", (req, res) => {
//     res.render("index#about-section", {
//         title: "About Us",
//         user: req.session.user || null
//     });
// });

// // Logout
// app.get("/logout", (req, res) => {
//     req.session.destroy((err) => {
//         if (err) console.error('Logout error:', err);
//         res.redirect("/");
//     });
// });

// // 404 Handler
// app.use((req, res) => {
//     res.status(404).render("404", {
//         title: "Page Not Found",
//         user: req.session.user || null
//     });
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Server: ${process.env.BASE_URL}`);
// });

// process.on('SIGINT', async () => {
//     await client.close();
//     process.exit(0);
// });

require('dotenv').config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const qs = require("querystring");
const path = require("path");
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 4000;

let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
    try {
        await client.connect();
        db = client.db();
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
}

connectDB();

app.set("view engine", "ejs");
app.set("views", [
    path.join(__dirname, "src", "pages"),
    path.join(__dirname, "src", "layouts"),
    path.join(__dirname, "src", "partials")
]);

app.use(express.static(path.join(__dirname, "public")));
app.use('/assets', express.static(path.join(__dirname, "assets")));
app.use('/style', express.static(path.join(__dirname, "style")));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
    console.log('📍', req.path);
    next();
});

// Home Route
app.get("/", (req, res) => {
    res.render("index", {
        title: "Home",
        user: req.session.user || null
    });
});

// Discord OAuth - FIXED
app.get("/auth/discord", async (req, res) => {
    const code = req.query.code;

    if (!code) return res.redirect("/");

    try {
        const tokenRes = await axios.post(
            "https://discord.com/api/oauth2/token",
            qs.stringify({
                client_id: process.env.DISCORD_CLIENT_ID || "1416879488855445536",
                client_secret: process.env.CLIENT_SECRET,
                grant_type: "authorization_code",
                redirect_uri: `${process.env.BASE_URL}/auth/discord`,
                code,
                scope: "identify email"
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const accessToken = tokenRes.data.access_token;

        const userData = await axios.get(
            "https://discord.com/api/users/@me",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const discordUser = userData.data;
        
        // ✅ FIX: Keep dots and special chars, only lowercase and remove spaces
        const cleanUsername = discordUser.username.toLowerCase().replace(/\s+/g, '');
        
        let user = await db.collection('users').findOne({ discordId: discordUser.id });

        if (!user) {
            const newUser = {
                discordId: discordUser.id,
                username: cleanUsername,
                discordUsername: discordUser.username, // ✅ Store original Discord username
                discordGlobalName: discordUser.global_name || discordUser.username, // ✅ Real display name
                avatar: discordUser.avatar,
                email: discordUser.email || null,
                bio: "مبدع في Crevion 🚀",
                customDisplayName: null, // User can customize later
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
        } else {
            // Update last login and sync Discord data
            await db.collection('users').updateOne(
                { discordId: discordUser.id },
                { 
                    $set: { 
                        lastLogin: new Date(),
                        discordUsername: discordUser.username,
                        discordGlobalName: discordUser.global_name || discordUser.username,
                        avatar: discordUser.avatar
                    } 
                }
            );
        }

        // ✅ Get the display name: custom > discord global name > discord username
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
                console.error('❌ Session Error:', err);
                return res.send("Session save failed");
            }
            res.redirect(`/@${user.username}`);
        });

    } catch (err) {
        console.error('❌ Auth Error:', err.response?.data || err.message);
        res.send(`Login failed: ${err.message}`);
    }
});

// Profile Route - ENHANCED
app.get("/@:username", async (req, res) => {
    const username = req.params.username.toLowerCase();

    try {
        const profileUser = await db.collection('users').findOne({ username });

        if (!profileUser) {
            return res.status(404).render("404userNotFound", {
                title: "User Not Found",
                username: req.params.username,
                user: req.session.user || null
            });
        }

        // Increment profile views (not for owner)
        const isOwner = req.session.user && req.session.user.discordId === profileUser.discordId;
        if (!isOwner) {
            await db.collection('users').updateOne(
                { discordId: profileUser.discordId },
                { $inc: { 'stats.views': 1 } }
            );
            profileUser.stats.views = (profileUser.stats.views || 0) + 1;
        }

        // Get user's projects
        const projects = await db.collection('projects')
            .find({ ownerId: profileUser.discordId })
            .sort({ createdAt: -1 })
            .toArray();

        // Get user's badges
        const userBadges = await db.collection('user_badges')
            .find({ userId: profileUser.discordId })
            .toArray();

        const badgeIds = userBadges.map(ub => ub.badgeId);
        const badges = badgeIds.length > 0
            ? await db.collection('badges').find({ _id: { $in: badgeIds } }).toArray()
            : [];

        // Check if viewer is following
        let isFollowing = false;
        if (req.session.user && !isOwner) {
            const followRecord = await db.collection('follows').findOne({
                followerId: req.session.user.discordId,
                followingId: profileUser.discordId
            });
            isFollowing = !!followRecord;
        }

        // ✅ Get proper display name
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
        res.status(500).send("Server Error");
    }
});

// Follow/Unfollow API
app.post("/api/follow/:username", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const targetUsername = req.params.username.toLowerCase();

    try {
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

// Redirect /profile to user's profile
app.get("/profile", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    }
    res.redirect(`/@${req.session.user.username}`);
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        res.redirect("/");
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).render("404", {
        title: "Page Not Found",
        user: req.session.user || null
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server: ${process.env.BASE_URL}`);
});

process.on('SIGINT', async () => {
    await client.close();
    process.exit(0);
});