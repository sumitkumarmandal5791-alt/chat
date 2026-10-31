const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "conversation",
            required: false,
            index: true
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: false,
            index: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: false // Optional for system messages
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: false // Present in 1-to-1 messages
        },
        message: {
            type: String,
            required: false
        },
        image: {
            type: String
        },
        video: {
            type: String
        },
        audio: {
            type: String
        },
        fileUrl: {
            type: String
        },
        fileName: {
            type: String
        },
        fileSize: {
            type: Number
        },
        contentType: {
            type: String,
            enum: ["text", "image", "video", "audio", "file", "system"],
            default: "text"
        },
        type: {
            type: String,
            enum: ["text", "image", "video", "audio", "file", "system"],
            default: "text"
        },
        replyTo: {
            messageId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Message"
            },
            statusId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Status"
            },
            senderName: {
                type: String
            },
            text: {
                type: String
            },
            mediaUrl: {
                type: String
            },
            contentType: {
                type: String
            }
        },
        mentions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            }
        ],
        deliveredTo: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "user"
                },
                deliveredAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        readBy: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "user"
                },
                readAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        reaction: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "user"
                },
                emoji: {
                    type: String
                }
            }
        ],
        messageStatus: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent"
        },
        deletedFor: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            }
        ]
    },
    { timestamps: true }
);

// Compound indexes
messageSchema.index({ groupId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
