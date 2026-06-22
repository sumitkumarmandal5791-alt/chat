const express = require("express")
const authcontroller = require("../controllers/authController")
const { authMiddleWare } = require("../middleware/authmiddleware")
const { uploadFileTocloudinary, multerMiddleWare } = require("../src/cloudaniry")
const router = express.Router()

router.post("/send-otp", authcontroller.sendOtp)
router.post("/verify-otp", authcontroller.verifyOtp)

router.post("/update-profile", authMiddleWare, multerMiddleWare, authcontroller.updateProfile)
router.get("/logout", authMiddleWare, authcontroller.logout)
router.get("/profile", authMiddleWare, authcontroller.checkAuthenticated)
router.get("/get-all-users", authMiddleWare, authcontroller.getAllUsers)



module.exports = router;
