// ============================================
// 📁 config/database.js
// ============================================
const { MongoClient, ServerApiVersion } = require('mongodb');

let db = null;
let client = null;

const connectDB = async () => {
    try {
        if (db) {
            console.log('✅ Already connected to MongoDB');
            return db;
        }

        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in .env file');
        }

        // ✅ إعدادات MongoDB Atlas المحدثة لحل مشكلة SSL
        const options = {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            // ✅ حل مشكلة SSL/TLS
            tls: true,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
        };

        console.log('🔄 Connecting to MongoDB Atlas...');
        
        client = new MongoClient(uri, options);

        await client.connect();
        
        // ✅ استخدام الداتابيز من الـ URI أو default
        db = client.db('crevion_db');
        
        console.log('✅ Connected to MongoDB Atlas');
        console.log('📦 Database: crevion_db');
        
        // Test connection
        await db.command({ ping: 1 });
        console.log('✅ Database connection verified successfully!');
        
        return db;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('1. Check your MONGODB_URI in .env file');
        console.error('2. Verify your IP is whitelisted in MongoDB Atlas (0.0.0.0/0 for all IPs)');
        console.error('3. Check your MongoDB Atlas username and password');
        console.error('4. Make sure your cluster is running');
        console.error('');
        process.exit(1);
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('❌ Database not initialized. Call connectDB first.');
    }
    return db;
};

const closeDB = async () => {
    if (client) {
        await client.close();
        db = null;
        client = null;
        console.log('👋 Database connection closed');
    }
};

module.exports = { connectDB, getDB, closeDB };