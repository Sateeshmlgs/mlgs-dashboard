const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
    revenue: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    history: {
        labels: [String],
        revenue: [Number],
        expenses: [Number]
    }
}, { timestamps: true });

module.exports = mongoose.model('Finance', financeSchema);
