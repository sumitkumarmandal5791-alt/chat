const { Server } = require('socket.io');
const Message = require('../models/Message');
const User = require('../models/User');

//map   to store userId and socketId
const onlineUsers = new Map();
//map to track typing status of users
const typingUsers = new Map();

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST", "DELETE", "PUT"],
            credentials: true
        },
        pingTimeout: 60000

    });

    //when a new socket connection is established
    io.on('connection', (socket) => {
        let userId = null; // To store the userId associated with this socket
        //handle user login and store their socketId

        socket.on("user_connected", async (connectingUserId) => {

            try {
                userId = connectingUserId; // Store the userId for this socket
                onlineUsers.set(userId, socket.id); // Map userId to socketId

                socket.join(userId)

                //update user staus in db
                await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

                //notify friends this user is online

                io.emit("user_status", { userId, isOnline: true });
            }
            catch (error) {
                console.error("Error in user_connected event:", error);
            }
        })

        //Return online status of requested users
        socket.on("get_online_status", async (requestedUserId, callback) => {
            try {
                const isOnline = onlineUsers.has(requestedUserId);
                callback({
                    userId: requestedUserId,
                    isOnline,
                    lastSeen: isOnline ? new Date() : null
                })
            } catch (error) {
                console.error("Error in get_online_status event:", error);
                callback(error, null);
            }
        });

        //forward message to receiver if online
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
        })


        //update as read and motify sender
        socket.on("message_read", async ({ messageId, readerId }) => {

            try {
                await Message.updateMany(
                    { _id: { $in: messageId } },
                    { $set: { messageStatus: "read" } }
                );
                const senderSocketId = onlineUsers.get(readerId);
                if (senderSocketId) {
                    messageId.forEach(id => {
                        io.to(senderSocketId).emit("message_status_updated", { messageId: id, messageStatus: "read" });
                    })
                }
            } catch (error) {
                console.error("Error in message_read event:", error);
            }
        })

        //handle type start events and notify the receiver
        socket.on("typing_start", async ({ conversationId, receiverId }) => {
            if (!userId || !receiverId || !conversationId) return;

            if (!typingUsers.has(userId)) {
                typingUsers.set(userId, {});
            }

            const userTypingStatus = typingUsers.get(userId);
            userTypingStatus[conversationId] = true;

            //clear any existing timeout for this user and conversation
            if (userTypingStatus[`${conversationId}_timeout`]) {
                clearTimeout(userTypingStatus[`${conversationId}_timeout`]);
            }


            //auto stop typing after 3 seconds of inactivity
            userTypingStatus[`${conversationId}_timeout`] = setTimeout(() => {
                userTypingStatus[conversationId] = false;
                socket.to(receiverId).emit("typing_stop", { conversationId, userId, isTyping: false });
                typingUsers.set(userId, userTypingStatus);
            }, 3000);

            //notify the receiver that the user is typing
            socket.to(receiverId).emit("typing_start", { conversationId, userId, isTyping: true });
            typingUsers.set(userId, userTypingStatus);
        })

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
        })

        // ADD or update reaction to a message
        socket.on("add_reaction", async ({ messageId, reactionuserId, emoji }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) {
                    return socket.emit("error", { message: "Message not found" });
                }

                const existingReactionIndex = message.reaction.findIndex(r => r.user.toString() === reactionuserId);

                if (existingReactionIndex > -1) {
                    const existing = message.reaction[existingReactionIndex];
                    if (existing.emoji === emoji) {
                        message.reaction.splice(existingReactionIndex, 1);
                    } else {
                        message.reaction[existingReactionIndex].emoji = emoji;
                    }
                }
                else {
                    message.reaction.push({ user: reactionuserId, emoji });
                }

                await message.save();
                const populatedMessage = await Message.findById(message._id)
                    .populate('senderId', 'username profilePicture')
                    .populate('receiverId', 'username profilePicture')
                    .populate('reaction.user', 'username profilePicture');

                const reactionUpdate = {
                    messageId: message._id,
                    reaction: populatedMessage.reaction
                }

                const senderSocketId = onlineUsers.get(message.receiverId.toString());
                const receiverSocketId = onlineUsers.get(message.senderId.toString());

                if (senderSocketId) {
                    io.to(senderSocketId).emit("reaction_updated", reactionUpdate);
                }

                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("reaction_updated", reactionUpdate);
                }
            }

            catch (error) {
                console.error("Error in add_reaction event:", error);
            }
        })

        //handle user disconnect and update their status
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

            }
            catch (error) {
                console.error("Error updating user status:", error);
            }
        }

        socket.on("disconnect", handleDisconnect);
    });

    io.socketUserMap = onlineUsers; // Expose the onlineUsers map for external use
    return io;

};

module.exports = initializeSocket;
