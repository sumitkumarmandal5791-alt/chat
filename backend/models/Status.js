const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ['text', 'image', 'video'],
            required: true,
            default: 'text'
        },
        text: {
            type: String,
            trim: true
        },
        backgroundColor: {
            type: String,
            default: '#075E54'
        },
        fontStyle: {
            type: String,
            default: 'sans'
        },
        media: {
            url: { type: String },
            publicId: { type: String },
            resourceType: { type: String, enum: ['image', 'video'] },
            width: { type: Number },
            height: { type: Number },
            durationInSeconds: { type: Number },
            bytes: { type: Number }
        },
        caption: {
            type: String,
            maxlength: 700,
            trim: true
        },
        privacy: {
            mode: {
                type: String,
                enum: ['contacts', 'contacts_except', 'only_share'],
                default: 'contacts'
            },
            userIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'user'
                }
            ]
        },
        viewers: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'user',
                    required: true
                },
                viewedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
    },
    { timestamps: true }
);

// TTL index for automatic expiration in MongoDB
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Compound index for querying a user's statuses chronologically
statusSchema.index({ user: 1, createdAt: -1 });

const Status = mongoose.model('Status', statusSchema);
module.exports = Status;
