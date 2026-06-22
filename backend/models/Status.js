const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
content: { type: String, required: true },
contentType: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
expireAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) }, // Expires after 24 hours
mediaUrl: { type: String },
createdAt: { type: Date, default: Date.now }
},{timestamps: true});

const Status = mongoose.model('Status', statusSchema);  
module.exports = Status;