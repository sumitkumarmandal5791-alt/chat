const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    otpHash: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['auth', 'signup', 'login', 'reset'],
        default: 'auth'
    },
    channel: {
        type: String,
        enum: ['email', 'sms', 'twilio_verify'],
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // MongoDB TTL index: automatically deletes document once expiresAt is reached
    }
}, {
    timestamps: true
});

otpSchema.index({ identifier: 1, purpose: 1 });
otpSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Otp', otpSchema);

