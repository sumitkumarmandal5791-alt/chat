const express = require("express")
const chatController = require("../controllers/chatController")
const { authMiddleWare } = require("../middleware/authmiddleware")
const { multerMiddleWare } = require("../src/cloudaniry")
const router = express.Router()

const uploadMessageMedia = (req, res, next) => {
    multerMiddleWare(req, res, (error) => {
        if (!error) return next();

        console.error("Message multipart parsing failed:", {
            code: error.code,
            message: error.message,
            field: error.field
        });

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Media file must be 10 MB or smaller" });
        }
        return res.status(400).json({ message: error.message || "Invalid message media" });
    });
};

router.post("/send-message", authMiddleWare, uploadMessageMedia, chatController.sendMessage)
router.get("/conversation/:userId", authMiddleWare, chatController.getConversation)
router.get("/conversations/:conversationId/messages", authMiddleWare, chatController.getMessages)
router.put("/messages/read", authMiddleWare, chatController.markAsRead)
router.delete("/messages/:messageId", authMiddleWare, chatController.deleteMessage)


module.exports = router;
