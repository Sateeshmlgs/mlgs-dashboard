const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    name: { type: String }, // Optional: store name for registration
    password: { type: String }, // Optional: store hashed password for registration
    createdAt: { type: Date, default: Date.now, index: { expires: '5m' } } // Expires in 5 minutes
});

module.exports = mongoose.model('OTP', otpSchema);
