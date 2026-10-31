const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member',
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        mutedUntil: {
            type: Date,
            default: null
        },
        lastReadMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null
        }
    },
    { _id: false }
);

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ''
        },
        avatar: {
            type: String,
            default: ''
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        members: [memberSchema],
        settings: {
            whoCanSend: {
                type: String,
                enum: ['all', 'admins'],
                default: 'all'
            },
            whoCanEditInfo: {
                type: String,
                enum: ['all', 'admins'],
                default: 'all'
            },
            inviteLinkEnabled: {
                type: Boolean,
                default: true
            }
        },
        inviteCode: {
            type: String,
            unique: true,
            sparse: true
        },
        maxMembers: {
            type: Number,
            default: 256
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null
        }
    },
    { timestamps: true }
);

// Indexes
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ createdAt: -1 });

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;

