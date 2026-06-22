const Status = require('../models/Status');
const { uploadFileTocloudinary } = require('../src/cloudaniry');
const response = require('../utils/responseHandler');
const Message = require('../models/Message');

exports.createStatus = async (req, res) => {
    try {

        const {content,contentType, userId} = req.body;
        const file = req.file;

        let mediaUrl = null;
        let finalContent = contentType === "text" ? content : null;


  if(file){
             const uploadResult = await uploadFileTocloudinary(file);
             if(!uploadResult || !uploadResult.secure_url){
                return res.status(500).json({ message: "file upload failed" })
             };

                if(file.mimetype.startsWith("video")){
                    finalContent = "video";
                    video = uploadResult.secure_url;
                } else if(file.mimetype.startsWith("image")){
                    finalContent = "image";
                    image = uploadResult.secure_url;
                }
                else{
                     return res.status(400).json({ message: "unsupported file type" })
                }
        }else if(finalContent?.trim()){
             finalContent="text";
        }else{
            return res.status(400).json({ message: "Message content is required" }) 
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Status expires in 24 hours

        const status = new Status({
            userId,
            content: finalContent,  
            contentType,
            mediaUrl: mediaUrl,
            expiresAt
        });

        await status.save();

        const populatedStatus = await Status.findById(status._id).populate('userId', 'username profilePicture')
        .populate("viewers", "username profilePicture");

        if(req.io||req.socketUserMap){
             for(const [connectionId, socketUserId] of req.socketUserMap.entries()){
                if(connectionId!==userId){
                    req.io.to(socketUserId).emit("new_status", populatedStatus);
                }
            }
        }

        return response.success(res, 'Status created successfully', 201, populatedStatus);
    } catch (error) {
        console.error('Error creating status:', error);
        return response.error(res, 'Failed to create status', 500);
    }
}

exports.getStatuses = async (req, res) => {

    try{
        const statuses = await Status.find({ expiresAt: { $gt: new Date() } })
        .populate('userId', 'username profilePicture')
        .populate("viewers", "username profilePicture")
        .sort({ createdAt: -1 });

        return response.success(res, 'Statuses fetched successfully', 200, statuses);
    }
    catch(error){
        console.error('Error fetching statuses:', error);
        return response.error(res, 'Failed to fetch statuses', 500);
    }
}

exports.viewStatus = async (req, res) => {

    const statusId = req.params.id;
    const userId = req.body.userId;
    try {
          const status = await Status.findById(statusId);
          if(!status){
            return response.error(res, 'Status not found', 404);
          }

            if(!status.viewers.includes(userId)){
                // Add user to viewers array
                status.viewers.push(userId);
                await status.save();

                const populatedStatus = await Status.findById(statusId).populate('userId', 'username profilePicture')
                .populate("viewers", "username profilePicture");

                    if(req.io||req.socketUserMap){


                        const statusOwnerSocketId = req.socketUserMap.get(status.userId.toString());
                        if(statusOwnerSocketId){
                          const viewerUpdate={
                            statusId: status._id,
                            viewers: populatedStatus.viewers,
                            viewerId: userId,
                            totalViewers: populatedStatus.viewers.length
                        };
                        req.io.to(statusOwnerSocketId).emit("status_viewed", viewerUpdate);
                    }
                }
            }
            return response.success(res, 'Status viewed successfully', 200, populatedStatus);   
    } catch (error) {
        console.error('Error viewing status:', error);
        return response.error(res, 'Failed to view status', 500);
    }
}

exports.deleteStatus = async (req, res) => {
    const statusId = req.params.id;
    const userId = req.body.userId; 

    try {
        const status = await Status.findById(statusId);
        if(!status){
            return response.error(res, 'Status not found', 404);
        }       
        if(status.userId.toString() !== userId){    
            return response.error(res, 'Unauthorized to delete this status', 403);
        }   
        await Status.findByIdAndDelete(statusId);


            if(req.io||req.socketUserMap){
            for(const [connectionId, socketUserId] of req.socketUserMap.entries()){
                if(connectionId!==userId){
                    req.io.to(socketUserId).emit("status_deleted", {statusId});
                }   
            }
        }
        return response.success(res, 'Status deleted successfully', 200);
    } catch (error) {
        console.error('Error deleting status:', error);
        return response.error(res, 'Failed to delete status', 500);
    }
}