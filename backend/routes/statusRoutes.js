const express = require("express")
const statusController = require("../controllers/statusController")
const { authMiddleWare } = require("../middleware/authmiddleware")
const { uploadFileTocloudinary, multerMiddleWare } = require("../src/cloudaniry")
const router = express.Router()

router.post("/", authMiddleWare, multerMiddleWare, statusController.createStatus)
router.get("/", authMiddleWare, statusController.getStatuses)

router.put("/:statusId/view", authMiddleWare, statusController.viewStatus)
router.delete("/:statusId", authMiddleWare, statusController.deleteStatus)



module.exports = router;
