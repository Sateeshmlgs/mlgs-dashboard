require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const Stock = require('./models/Stock');
const Finance = require('./models/Finance');
const User = require('./models/User');
const OTP = require('./models/OTP');
const nodemailer = require('nodemailer');

const path = require('path');
const FRONTEND_PATH = path.resolve(__dirname);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- Email Config ---
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Serve static files from the root directory
app.use(express.static(FRONTEND_PATH));

// Specifically serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Catch-all route to serve index.html for any non-API request (SPA support)
app.get(/.*/, (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
})
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// --- Auth Routes ---

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to DB
        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verification Code - MLGS Dashboard',
            text: `Your verification code is: ${otp}. It will expire in 5 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent successfully' });
    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ error: 'Failed to send OTP. Please check your email credentials.' });
    }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const record = await OTP.findOne({ email, otp });
        
        if (!record) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }
        
        res.json({ success: true, message: 'OTP verified' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;
        
        // Final OTP check before registration
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Please verify your email first' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User already exists' });

        user = new User({ name, email, password });
        await user.save();

        // Delete OTP after success
        await OTP.deleteOne({ email });

        res.json({ success: true, message: 'Account created! Please login.' });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const email = req.body.email.trim();
        const password = req.body.password.trim();
        console.log(`Login attempt for: [${email}]`); // Wrapped in brackets to see spaces in logs
        
        const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
        if (!user) {
            console.log(`Login failed: User not found for [${email}]`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for ${email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        console.log(`Login success: ${email}`);

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET || 'mlgs_secret_key_2024', { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { name: user.name, email: user.email } });
        });
    } catch (err) {
        console.error("Login Error Stack:", err.stack);
        res.status(500).json({ error: err.message });
    }
});

// Get User Data
app.get('/api/auth/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Stocks API (Protected) ---

app.get('/api/stocks', auth, async (req, res) => {
    try {
        const stocks = await Stock.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stocks', auth, async (req, res) => {
    try {
        const newStock = new Stock({ ...req.body, user: req.user.id });
        const savedStock = await newStock.save();
        res.status(201).json(savedStock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/stocks/:id', auth, async (req, res) => {
    try {
        const updatedStock = await Stock.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            req.body,
            { new: true }
        );
        res.json(updatedStock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/stocks/:id', auth, async (req, res) => {
    try {
        await Stock.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        res.json({ message: 'Stock deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Finance API (Protected) ---

app.get('/api/finance', auth, async (req, res) => {
    try {
        let finance = await Finance.findOne({ user: req.user.id });
        if (!finance) {
            finance = await Finance.create({
                user: req.user.id,
                revenue: 0,
                expenses: 0,
                history: { labels: [], revenue: [], expenses: [] }
            });
        }
        res.json(finance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/finance', auth, async (req, res) => {
    try {
        const updated = await Finance.findOneAndUpdate(
            { user: req.user.id },
            req.body,
            { new: true, upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ health: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
