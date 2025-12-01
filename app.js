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

app.get("/", (req, res) => {
    res.render("index", { 
        title: "Home",
        user: req.session.user || null
    }); 
});

app.get("/auth/discord", async (req, res) => {
    const code = req.query.code;
    
    if (!code) return res.redirect("/");

    try {
        const tokenRes = await axios.post(
            "https://discord.com/api/oauth2/token",
            qs.stringify({
                client_id: "1416879488855445536",
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
        let user = await db.collection('users').findOne({ discordId: discordUser.id });
        
        if (!user) {
            const newUser = {
                discordId: discordUser.id,
                username: discordUser.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                displayName: discordUser.username,
                avatar: discordUser.avatar,
                email: discordUser.email || null,
                bio: "",
                skills: [],
                stats: {
                    projects: 0,
                    followers: 0,
                    following: 0,
                    likes: 0
                },
                badges: [],
                isPro: false,
                createdAt: new Date()
            };
            
            const result = await db.collection('users').insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
        }
        
        req.session.user = {
            id: user._id.toString(),
            discordId: user.discordId,
            username: user.username,
            displayName: user.displayName || user.username,
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

app.get("/@:username", async (req, res) => {
    const username = req.params.username.toLowerCase();
    
    try {
        const user = await db.collection('users').findOne({ username });
        
        if (!user) {
            return res.status(404).render("404-user", { 
                title: "User Not Found",
                username: req.params.username,
                user: req.session.user || null
            });
        }

        const projects = await db.collection('projects')
            .find({ ownerId: user.discordId })
            .sort({ createdAt: -1 })
            .toArray();

        const isOwner = req.session.user && req.session.user.discordId === user.discordId;

        res.render("profile-public", {
            title: `${user.displayName || user.username} - Profile`,
            profileUser: {
                ...user,
                avatarURL: user.avatar 
                    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
            },
            projects,
            isOwner,
            user: req.session.user || null
        });

    } catch (err) {
        console.error('❌ Profile Error:', err);
        res.status(500).send("Server Error");
    }
});

app.get("/profile", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    }
    res.redirect(`/@${req.session.user.username}`);
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        res.redirect("/");
    });
});

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