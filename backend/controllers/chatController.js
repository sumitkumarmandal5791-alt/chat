const Conversation = require('../models/conversation');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const { uploadFileTocloudinary } = require('../src/cloudaniry');

//create the chat bt two users
exports.sendMessage = async (req, res) => {
    const requestId = req.headers["x-request-id"] || new mongoose.Types.ObjectId().toString();
    let stage = "request validation";

    try {
        const { message, receiverId, content, messageStatus } = req.body;
        const senderId = req.userId || req.user?._id;
        const file = req.file;

        if (!senderId || !mongoose.isValidObjectId(senderId)) {
            return res.status(401).json({ message: "Authenticated sender is invalid" });
        }
        if (!receiverId || !mongoose.isValidObjectId(receiverId)) {
            return res.status(400).json({ message: "A valid receiver is required" });
        }
        if (String(senderId) === String(receiverId)) {
            return res.status(400).json({ message: "You cannot send a message to yourself" });
        }

        // Use 'message' if 'content' is not provided (handles user payload)
        const finalContent = typeof (content || message) === "string"
            ? (content || message).trim()
            : "";

        const participants = [senderId, receiverId].sort();

        stage = "loading conversation";
        let conversation = await Conversation.findOne({
            participants: { $all: participants, $size: participants.length }
        });
        if (!conversation) {
            stage = "creating conversation";
            conversation = new Conversation({ participants});
           await conversation.save();
        }
        if (!Array.isArray(conversation.messages)) {
            conversation.messages = [];
        }
        let image = null;
        let video = null;
        let contentType = null;

        //handleFileUpload

        if(file){
             stage = "uploading media";
             let uploadResult;
             try {
                 uploadResult = await uploadFileTocloudinary(file);
             } catch (uploadError) {
                 console.error("Message media upload failed:", uploadError.message);
                 return res.status(502).json({ message: "Message media upload failed" });
             }
             if(!uploadResult || !uploadResult.secure_url){
                return res.status(502).json({ message: "Message media upload failed" })
             };

                if(file.mimetype.startsWith("video")){
                    contentType = "video";
                    video = uploadResult.secure_url;
                } else if(file.mimetype.startsWith("image")){
                    contentType = "image";
                    image = uploadResult.secure_url;
                }
                else{
                     return res.status(400).json({ message: "unsupported file type" })
                }
        }else if(finalContent?.trim()){
             contentType="text";
        }else{
            return res.status(400).json({ message: "Message content is required" }) 
        }

        let replyTo = null;
        stage = "creating message";
        if (req.body.replyTo) {
            try {
                replyTo = typeof req.body.replyTo === 'string' ? JSON.parse(req.body.replyTo) : req.body.replyTo;
            } catch (e) {
                replyTo = null;
            }
        }

        const newMessage = new Message({
             replyTo,
             conversationId: conversation._id,
             senderId: senderId,
             receiverId: receiverId,
             message: finalContent,
             contentType,
             image,
             video,
             messageStatus: ["sent", "delivered", "read"].includes(messageStatus) ? messageStatus : "sent"
        })
        stage = "saving message";
        await newMessage.save();
        if (newMessage.message) {
             conversation.lastMessage = newMessage._id;
        }
        stage = "saving conversation";
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        conversation.lastMessage = newMessage._id;
        conversation.messages.push(newMessage._id);
        await conversation.save();
           

        stage = "populating message";
        const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'username profilePicture')
        .populate('receiverId', 'username profilePicture');

        if(req.io && req.socketUserMap){
            const receiverSocketId = req.socketUserMap.get(receiverId.toString());
            if(receiverSocketId){
                req.io.to(receiverSocketId).emit("newMessage", populatedMessage);
                newMessage.messageStatus = "delivered";
                await newMessage.save();
            }
        }

        return res.status(200).json({ message: "Message sent successfully", data: populatedMessage })
    }
    catch(error) {
        console.error("Error in sendMessage:", {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            requestId,
            stage,
            userId: req.userId || req.user?._id,
            receiverId: req.body?.receiverId,
            hasFile: Boolean(req.file)
        });

        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Invalid message data", details: error.message, requestId });
        }
        if (error.name === "MongooseError" || error.name === "MongoServerError") {
            return res.status(503).json({ message: "Database unavailable while sending message", requestId });
        }
        return res.status(500).json({ message: "Unable to send message", details: error.message, stage, requestId });
    }
}

//get conversation list of user
exports.getConversation = async (req, res) => {
    const userId1 = req.params.userId;

    if (!mongoose.isValidObjectId(userId1)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try{
        const conversations = await Conversation.find({ participants: userId1 })
        .populate("participants", "username profilePicture isOnline lastSeen")
        .populate({ path: "lastMessage", populate: { path: "senderId receiverId", select: "username profilePicture" } })
        .sort({ updatedAt: -1 });

        return res.status(200).json({ message: "Conversations retrieved successfully", data: conversations })
    }
    catch(error){
        console.error("Error in getConversation:", error);
        return res.status(500).json({ message: "Unable to retrieve conversation" })
    }
}


//get messages of specific converastion
exports.getMessages = async (req, res) => {
    const conversationId = req.params.conversationId;
    const userId = req.user._id;

    try{
        const conversation=await Conversation.findById(conversationId);
        if(!conversation){
            return res.status(404).json({ message: "conversation not found" })
        }

        if(!conversation.participants.includes(userId)){
            return res.status(403).json({ message: "access denied" })
        }

        const messages = await Message.find({ conversationId: conversationId, deletedFor: { $ne: userId } })
        .populate('senderId', 'username profilePicture')
        .populate('receiverId', 'username profilePicture')
        .sort({ createdAt: 1 });

        await Message.updateMany({
             conversationId: conversationId, 
             receiverId: userId,
              messageStatus: { $nin:  ["sent" ,"delivered"]  }
        }, { $set: { messageStatus: "delivered" } }
        );
        

         conversation.unreadCount = 0;
         await conversation.save();
        return res.status(200).json({ message: "Messages retrieved successfully", data: messages });
    } catch(error){
        return res.status(500).json({ message: "internal server error in get messages"+error.message })
    } 
}

exports.markAsRead=async(req,res)=>{
      const {messageIds} = req.body || {};
      const userId=req.user._id || req.user.id;
      
      if(!messageIds || !Array.isArray(messageIds) || messageIds.length === 0){
          return res.status(400).json({ message: "messageIds array is required in the request body" });
      }
    
      try{
        // Bulk update all unread messages sent to this user
        await Message.updateMany(
            {
                _id: { $in: messageIds },
                receiverId: userId,
                messageStatus: { $ne: "read" }
            },
            { $set: { messageStatus: "read" } }
        );

        // Notify original senders via socket
        if(req.io && req.socketUserMap){
            const messages = await Message.find({ _id: { $in: messageIds } });
            for(const msg of messages){
                const senderId = msg.senderId.toString();
                const senderSocketId = req.socketUserMap.get(senderId);

                if(senderSocketId){
                     req.io.to(senderSocketId).emit("message_status_updated", {
                         messageId: msg._id,
                         messageStatus: "read"
                     });
                }
            }
        }

         return res.status(200).json({ message: "Messages marked as read successfully" })
      }
      catch(error){
        console.error("Error in markAsRead:", error);
        return res.status(500).json({ message: "internal server error in mark as read" })
      }
      
}

exports.deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const { type } = req.query; // 'me' or 'everyone'
    const userId = req.user._id || req.user.id;

    try {
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "message not found" });
        }

        if (type === "everyone") {
            // Only the sender can delete for everyone
            if (message.senderId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Access denied. Only the sender can delete for everyone." });
            }

            const conversationId = message.conversationId;
            await message.deleteOne();

            // Emit to both users to update the UI in real-time
            if (req.io && req.socketUserMap) {
                const receiverId = message.receiverId.toString();
                const senderId = message.senderId.toString();
                
                const receiverSocketId = req.socketUserMap.get(receiverId);
                const senderSocketId = req.socketUserMap.get(senderId);

                if (receiverSocketId) {
                    req.io.to(receiverSocketId).emit("messageDeleted", { messageId, conversationId, type: "everyone" });
                }
                if (senderSocketId) {
                    req.io.to(senderSocketId).emit("messageDeleted", { messageId, conversationId, type: "everyone" });
                }
            }
        } else {
            // Delete for me
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
                await message.save();
            }

            // If both participants deleted the message for themselves, delete it from the DB entirely
            if (message.deletedFor.includes(message.senderId) && message.deletedFor.includes(message.receiverId)) {
                await message.deleteOne();
            }

            // Emit socket to the user who triggered it to update in real-time
            if (req.io && req.socketUserMap) {
                const senderSocketId = req.socketUserMap.get(userId.toString());
                if (senderSocketId) {
                    req.io.to(senderSocketId).emit("messageDeleted", { messageId, conversationId: message.conversationId, type: "me" });
                }
            }
        }

        return res.status(200).json({ message: "Message deleted successfully", messageId, type });
    }
    catch (error) {
        console.error("Error in deleteMessage:", error);
        return res.status(500).json({ message: "internal server error in delete message" });
    }
}

   
       