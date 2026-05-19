const express = require("express")
const authcontroller = require("../controllers/authController")
const router = express.Router()


router.post("/send-otp", authcontroller.sendOtp)
router.post("/verify-otp", authcontroller.verifyOtp)

module.exports = router;
