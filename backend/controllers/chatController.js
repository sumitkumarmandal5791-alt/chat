const Conversation = require('../models/conversation');
const Message = require('../models/Message');
const { uploadFileTocloudinary } = require('../src/cloudaniry');

//create the chat bt two users
exports.sendMessage = async (req, res) => {
    try {
        const { message, senderId, receiverId, content, messageStatus } = req.body; 
        const file = req.file;

        // Use 'message' if 'content' is not provided (handles user payload)
        const finalContent = content || message;

        const participants = [senderId, receiverId].sort();

        let conversation = await Conversation.findOne({ participants });
        if (!conversation) {
            conversation = new Conversation({ participants});
           await conversation.save();
        }
        let image = null;
        let video = null;

        //handleFileUpload

        if(file){
             const uploadResult = await uploadFileTocloudinary(file);
             if(!uploadResult || !uploadResult.secure_url){
                return res.status(500).json({ message: "file upload failed" })
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

        const newMessage = new Message({
             conversationId: conversation._id,
             senderId: senderId,
             receiverId: receiverId,
             message: finalContent,
             contentType,
             image,
             video,
             messageStatus: messageStatus || "sent"
        })
         console.log("Message saved successfully:", newMessage);
        
        await newMessage.save();
        if (newMessage.message) {
             conversation.lastMessage = newMessage._id;
        }
         console.log("Message saved successfully:", newMessage);

        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        conversation.lastMessage = newMessage._id;
        conversation.messages.push(newMessage._id);
        await conversation.save();
           

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
        console.error("Error in sendMessage:", error);
        return res.status(500).json({ message: "internal server error in send message", error: error.message })
    }
}

//get conversation list of user
exports.getConversation = async (req, res) => {
    const userId1 = req.params.userId;

    try{
        const conversations = await Conversation.find({ participants: userId1 })
        .populate("participants", "username profilePicture isOnline lastSeen")
        .populate({ path: "lastMessage", populate: { path: "senderId receiverId", select: "username profilePicture" } })
        .sort({ updatedAt: -1 });

        return res.status(200).json({ message: "Conversations retrieved successfully", data: conversations })
    }
    catch(error){
        return res.status(500).json({ message: "internal server error in get conversation"+error.message })
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

        const messages = await Message.find({ conversationId: conversationId })
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
      const {messageId} = req.body || {};
      const userId=req.user._id || req.user.id;
      
      if(!messageId){
          return res.status(400).json({ message: "messageId is required in the request body" });
      }
    
      try{
        const message = await Message.findOne({
                _id: messageId,
                receiverId: userId,
        });

        if(!message){
            return res.status(404).json({ message: "message not found" })
        }

        await Message.updateOne({
            _id: messageId,
            receiverId: userId,
            messageStatus: { $ne: "read" }
        }, { $set: { messageStatus: "read" } }
        );

        //notify to original sender

         if(req.io && req.socketUserMap){
             for(const messasge of message){
                const senderId = messasge.senderId.toString();
                const senderSocketId = req.socketUserMap.get(senderId);

                if(senderSocketId){
                     const updatedMessage={
                        _id: message._id,
                        messageStatus: "read"
                     }

                     req.io.to(senderSocketId).emit("messageRead", updatedMessage);
                     await message.save();
                }
        }

    }
         return res.status(200).json({ message: "Message marked as read successfully" })
      }
      catch(error){
        return res.status(500).json({ message: "internal server error in mark as read" })
      }
      
}

exports.deleteMessage=async(req,res)=>{
    const {messageId} = req.params;
    const userId=req.user.id;

    try{
        const message = await Message.findById(messageId);
        if(!message){
            return res.status(404).json({ message: "message not found" })
        }       
        
        if(message.senderId.toString() !== userId ){
            return res.status(403).json({ message: "access denied" })
        }

        await message.deleteOne();

          if(req.io||req.socketUserMap){
               const receiverSocketId=req.socketUserMap.get(message.receiver.toString())
               
               if(receiverSocketId){
                    req.io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
               }
            }
        return res.status(200).json({ message: "Message deleted successfully" })
    }
    catch(eror){
        return res.status(500).json({ message: "internal server error in delete message" })
    }
}

   
       