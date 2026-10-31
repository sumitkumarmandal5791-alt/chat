const { Server } = require('socket.io');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const { verifyAccessToken } = require('../utils/tokenService');

// map to store userId and socketId
const onlineUsers = new Map();
// map to track typing status of users
const typingUsers = new Map();

const initializeSocket = (server, allowedOrigins = ["http://localhost:5173"]) => {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
            credentials: true
        },
        pingTimeout: 60000
    });

    // Authenticate socket connection on handshake
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (token) {
                try {
                    const decoded = verifyAccessToken(token);
                    socket.user = decoded;
                    socket.userId = decoded._id?.toString();
                } catch (err) {
                    console.warn('Socket authentication warning:', err.message);
                }
            }
            next();
        } catch (err) {
            next();
        }
    });

    // when a new socket connection is established
    io.on('connection', (socket) => {
        let userId = null; // To store the userId associated with this socket

        // handle user login and store their socketId
        socket.on("user_connected", async (connectingUserId) => {
            try {
                userId = connectingUserId; // Store the userId for this socket
                onlineUsers.set(userId, socket.id); // Map userId to socketId

                socket.join(userId);
                socket.join(`user:${userId}`);

                // Automatically join all groups this user is a member of
                try {
                    const userGroups = await Group.find({ 'members.userId': userId }).select('_id');
                    userGroups.forEach((group) => {
                        socket.join(`group:${group._id}`);
                    });
                } catch (grpErr) {
                    console.error("Error auto-joining user group rooms:", grpErr.message);
                }

                // update user status in db
                await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

                // notify friends/contacts this user is online
                io.emit("user_status", { userId, isOnline: true });
            } catch (error) {
                console.error("Error in user_connected event:", error);
            }
        });

        // Explicit group room join/leave listeners
        socket.on("group:join_room", ({ groupId }) => {
            if (groupId) {
                socket.join(`group:${groupId}`);
            }
        });

        socket.on("group:leave_room", ({ groupId }) => {
            if (groupId) {
                socket.leave(`group:${groupId}`);
            }
        });

        // Group typing events
        socket.on("group:typing_start", ({ groupId, username }) => {
            if (!groupId || !userId) return;
            socket.to(`group:${groupId}`).emit("group:typing", {
                groupId,
                userId,
                username: username || "Someone",
                isTyping: true
            });
        });

        socket.on("group:typing_stop", ({ groupId, username }) => {
            if (!groupId || !userId) return;
            socket.to(`group:${groupId}`).emit("group:typing", {
                groupId,
                userId,
                username: username || "Someone",
                isTyping: false
            });
        });

        // Group read receipts
        socket.on("group:message:read", async ({ groupId, messageId }) => {
            if (!groupId || !userId) return;
            socket.to(`group:${groupId}`).emit("group:message:read_updated", {
                groupId,
                messageId,
                userId
            });
        });

        // Return online status of requested users
        socket.on("get_online_status", async (requestedUserId, callback) => {
            try {
                const isOnline = onlineUsers.has(requestedUserId);
                if (typeof callback === 'function') {
                    callback({
                        userId: requestedUserId,
                        isOnline,
                        lastSeen: isOnline ? new Date() : null
                    });
                }
            } catch (error) {
                console.error("Error in get_online_status event:", error);
                if (typeof callback === 'function') callback(error, null);
            }
        });

        // forward 1-to-1 message to receiver if online
        socket.on("send_message", async (message) => {
            try {
                const receiverSocketId = onlineUsers.get(message.receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive_message", message);
                }
            } catch (error) {
                console.error("Error in send_message event:", error);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // update as read and notify sender (1-to-1)
        socket.on("message_read", async ({ messageId, readerId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: Array.isArray(messageId) ? messageId : [messageId] } },
                    { $set: { messageStatus: "read" } }
                );
                const senderSocketId = onlineUsers.get(readerId);
                if (senderSocketId) {
                    const ids = Array.isArray(messageId) ? messageId : [messageId];
                    ids.forEach(id => {
                        io.to(senderSocketId).emit("message_status_updated", { messageId: id, messageStatus: "read" });
                    });
                }
            } catch (error) {
                console.error("Error in message_read event:", error);
            }
        });

        // handle 1-to-1 type start events and notify the receiver
        socket.on("typing_start", async ({ conversationId, receiverId }) => {
            if (!userId || !receiverId || !conversationId) return;

            if (!typingUsers.has(userId)) {
                typingUsers.set(userId, {});
            }

            const userTypingStatus = typingUsers.get(userId);
            userTypingStatus[conversationId] = true;

            // clear any existing timeout for this user and conversation
            if (userTypingStatus[`${conversationId}_timeout`]) {
                clearTimeout(userTypingStatus[`${conversationId}_timeout`]);
            }

            // auto stop typing after 3 seconds of inactivity
            userTypingStatus[`${conversationId}_timeout`] = setTimeout(() => {
                userTypingStatus[conversationId] = false;
                socket.to(receiverId).emit("typing_stop", { conversationId, userId, isTyping: false });
                typingUsers.set(userId, userTypingStatus);
            }, 3000);

            // notify the receiver that the user is typing
            socket.to(receiverId).emit("typing_start", { conversationId, userId, isTyping: true });
            typingUsers.set(userId, userTypingStatus);
        });

        socket.on("typing_stop", async ({ conversationId, receiverId }) => {
            if (!userId || !receiverId || !conversationId) return;

            if (typingUsers.has(userId)) {
                const userTypingStatus = typingUsers.get(userId);
                userTypingStatus[conversationId] = false;

                if (userTypingStatus[`${conversationId}_timeout`]) {
                    clearTimeout(userTypingStatus[`${conversationId}_timeout`]);
                    delete userTypingStatus[`${conversationId}_timeout`];
                }
            }
            socket.to(receiverId).emit("typing_stop", { conversationId, userId, isTyping: false });
        });

        // ADD or update reaction to a message
        socket.on("add_reaction", async ({ messageId, reactionuserId, emoji }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) {
                    return socket.emit("error", { message: "Message not found" });
                }

                if (!message.reaction) message.reaction = [];
                const existingReactionIndex = message.reaction.findIndex(r => r.user.toString() === reactionuserId);

                if (existingReactionIndex > -1) {
                    const existing = message.reaction[existingReactionIndex];
                    if (existing.emoji === emoji) {
                        message.reaction.splice(existingReactionIndex, 1);
                    } else {
                        message.reaction[existingReactionIndex].emoji = emoji;
                    }
                } else {
                    message.reaction.push({ user: reactionuserId, emoji });
                }

                await message.save();
                const populatedMessage = await Message.findById(message._id)
                    .populate('senderId', 'username profilePicture')
                    .populate('reaction.user', 'username profilePicture');

                const reactionUpdate = {
                    messageId: message._id,
                    reaction: populatedMessage.reaction
                };

                // If group message, broadcast to group room
                if (message.groupId) {
                    io.to(`group:${message.groupId}`).emit("reaction_updated", reactionUpdate);
                } else {
                    // 1-to-1 message
                    const senderSocketId = onlineUsers.get(message.receiverId?.toString());
                    const receiverSocketId = onlineUsers.get(message.senderId?.toString());

                    if (senderSocketId) {
                        io.to(senderSocketId).emit("reaction_updated", reactionUpdate);
                    }
                    if (receiverSocketId) {
                        io.to(receiverSocketId).emit("reaction_updated", reactionUpdate);
                    }
                }
            } catch (error) {
                console.error("Error in add_reaction event:", error);
            }
        });

        // handle user disconnect and update their status
        const handleDisconnect = async () => {
            if (!userId) {
                return;
            }
            try {
                onlineUsers.delete(userId);

                if (typingUsers.has(userId)) {
                    const userTypingStatus = typingUsers.get(userId);
                    Object.keys(userTypingStatus).forEach(key => {
                        if (key.endsWith("_timeout")) {
                            clearTimeout(userTypingStatus[key]);
                        }
                    });
                    typingUsers.delete(userId);
                }

                await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
                io.emit("user_status", { userId, isOnline: false, lastSeen: new Date() });

                socket.leave(userId);
                socket.leave(`user:${userId}`);
            } catch (error) {
                console.error("Error updating user status:", error);
            }
        };

        socket.on("disconnect", handleDisconnect);
    });

    io.socketUserMap = onlineUsers; // Expose the onlineUsers map for external use
    return io;
};

module.exports = initializeSocket;
