const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    refreshTokenHash: {
        type: String,
        required: true
    },
    device: {
        type: String,
        default: 'Unknown Device'
    },
    ip: {
        type: String,
        default: '0.0.0.0'
    },
    userAgent: {
        type: String,
        default: 'Unknown User-Agent'
    },
    lastActiveAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const UserSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        sparse: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        sparse: true,
        unique: true,
        validate: {
            validator: function (v) {
                if (!v) return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    name: {
        type: String,
        trim: true,
        default: ''
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    profilePicture: {
        type: String,
        default: ''
    },
    about: {
        type: String,
        default: 'Hey there! I am using WhatsApp.'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    // Multi-device active session tracking
    sessions: [sessionSchema],
    // WhatsApp Status Privacy default setting
    statusPrivacy: {
        mode: {
            type: String,
            enum: ['contacts', 'contacts_except', 'only_share'],
            default: 'contacts'
        },
        userIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
