const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        image: {
            type: String,
        },
        video: {
            type: String,
        },
        audio: {
            type: String,
        },
        contentType: {
            type: String,
            enum: ["text", "image", "video", "audio"],
            default: "text",
        },
        reaction: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                emoji: {
                    type: String,
                }
            },
        ],
        messageStatus: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent",
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;