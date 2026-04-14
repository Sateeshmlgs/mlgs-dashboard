const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    image: { type: String } // Base64 or URL
}, { timestamps: true });

module.exports = mongoose.model('Stock', stockSchema);
