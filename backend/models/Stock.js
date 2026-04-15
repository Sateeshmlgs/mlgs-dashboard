const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0 },
    image: { type: String }, // Base64 image
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Stock', stockSchema);
