const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
    revenue: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    history: {
        labels: [String],
        revenue: [Number],
        expenses: [Number]
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Finance', financeSchema);
