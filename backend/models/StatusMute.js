const mongoose = require('mongoose');

const statusMuteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        mutedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

// Compound unique index so a user cannot mute the same user multiple times
statusMuteSchema.index({ user: 1, mutedUser: 1 }, { unique: true });

const StatusMute = mongoose.model('StatusMute', statusMuteSchema);
module.exports = StatusMute;

