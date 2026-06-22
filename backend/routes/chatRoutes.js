const express = require("express")
const chatController = require("../controllers/chatController")
const { authMiddleWare } = require("../middleware/authmiddleware")
const { uploadFileTocloudinary, multerMiddleWare } = require("../src/cloudaniry")
const router = express.Router()

router.post("/send-message", authMiddleWare, multerMiddleWare, chatController.sendMessage)
router.get("/conversation/:userId", authMiddleWare, chatController.getConversation)
router.get("/conversations/:conversationId/messages", authMiddleWare, chatController.getMessages)
router.put("/messages/read", authMiddleWare, chatController.markAsRead)
router.delete("/messages/:messageId", authMiddleWare, chatController.deleteMessage)



module.exports = router;
