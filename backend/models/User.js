const mongoose = require('mongoose');


const UserSchema = new mongoose.Schema({
    id: {
        type: Number,
        unique: true,
        sparse: true
    },
    phoneNumber: {
        type: Number,
        sparse: true,
        unique: true
    },

    phoneSuffix: {
        type: Number,

    },

    name: {
        type: String,
    },
    username: {
        type: String,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }

    },
    emailOtp: {
        type: String,
    },
    emailOtpExpiry: {
        type: Date,
    },
    profilePicture: {
        type: String,
    },
    about: {
        type: String,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["online", "offline"],
        default: "offline",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    agreed: {
        type: Boolean,
        default: false,
    },

}, { timestamps: true })

const User = mongoose.model("user", UserSchema)
module.exports = User; 