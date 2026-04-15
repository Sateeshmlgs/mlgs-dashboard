require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Stock = require('./models/Stock');
const Finance = require('./models/Finance');

const app = express();
app.use(express.json({ limit: '50mb' })); // Higher limit for Base64 images
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
})
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        seedStocks();
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if cannot connect
    });

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ 
        health: 'ok', 
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

// Seed Stocks if empty
async function seedStocks() {
    try {
        const count = await Stock.countDocuments();
        if (count === 0) {
            await Stock.create([
                { name: "Luxury Silk CurtainsSet (Beige)", quantity: 12, price: 85 },
                { name: "Aromatic Sandalwood Candle", quantity: 45, price: 25 },
                { name: "Handcrafted Ceramic Vase", quantity: 8, price: 55 },
                { name: "LED Ambient Mood Lamp", quantity: 20, price: 40 }
            ]);
            console.log("Database seeded with sample MLGS products.");
        }
    } catch (err) {
        console.error("Seeding error:", err);
    }
}


// --- Stocks API ---

// Get all stocks
app.get('/api/stocks', async (req, res) => {
    try {
        const stocks = await Stock.find().sort({ createdAt: -1 });
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new stock
app.post('/api/stocks', async (req, res) => {
    try {
        const newStock = new Stock(req.body);
        const savedStock = await newStock.save();
        res.status(201).json(savedStock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update stock
app.put('/api/stocks/:id', async (req, res) => {
    try {
        const updatedStock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedStock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete stock
app.delete('/api/stocks/:id', async (req, res) => {
    try {
        await Stock.findByIdAndDelete(req.params.id);
        res.json({ message: 'Stock deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Finance API ---

// Get finance data
app.get('/api/finance', async (req, res) => {
    try {
        let finance = await Finance.findOne();
        if (!finance) {
            // Initial seed if empty
            finance = await Finance.create({
                revenue: 124500, expenses: 82300,
                history: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    revenue: [15000, 18000, 22000, 19000, 25000, 25500],
                    expenses: [10000, 12000, 15000, 13000, 16000, 16300]
                }
            });
        }
        res.json(finance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update totals
app.put('/api/finance', async (req, res) => {
    try {
        const updated = await Finance.findOneAndUpdate({}, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
