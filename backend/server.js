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

const path = require('path');
const FRONTEND_PATH = path.resolve(__dirname);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

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

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, password } = req.body;
        const email = req.body.email.toLowerCase(); // Lowercase email
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User already exists' });

        user = new User({ name, email, password });
        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET || 'mlgs_secret_key_2024', { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { name: user.name, email: user.email } });
        });
    } catch (err) {
        console.error("Registration Error Stack:", err.stack);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.body.email.toLowerCase(); // Lowercase email
        console.log(`Login attempt for: ${email}`);
        
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Login failed: User not found for ${email}`);
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
