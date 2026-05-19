const User = require("../modes/User")
const otpGenerate = require('../utils/otpGenerate');
const sendOtpToEmail = require('../services/emial');
const { sendOtpTOPhoneNumber, checkOtpTOPhoneNumber } = require("../services/phone")
const generateJsonWebToken = require("../utils/jsonWebToken")

const sendOtp = async (req, res) => {
    const { phoneNumber, email, phoneSuffix } = req.body;

    const otp = otpGenerate();

    const expiryTime = Date.now() + 10 * 60 * 1000;

    let user;
    try {

        if (email) {

            user = await User.findOne({ email })

            if (!user) {
                user = await new User({ email })
            }
            user.emailOtp = otp;
            user.emailOtpExpiry = expiryTime;
            await sendOtpToEmail(email, otp);
            await user.save();
            return res.status(200).json({ message: "otp send successfully" })
        }

        if (!phoneNumber || !phoneSuffix) {
            return res.status(400).json({ message: "phone number and phone suffix are required" })
        }


        const fullPhoneNumber = phoneSuffix + phoneNumber;

        user = await User.findOne({ fullPhoneNumber })

        if (!user) {
            user = await new User({ fullPhoneNumber, phoneSuffix, phoneNumber })
        }
        await sendOtpTOPhoneNumber(fullPhoneNumber);
        await user.save();



    }

    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error +authcontroller+sendOtp" })
    }

}

//verify otp

const verifyOtp = async (req, res) => {
    const { phoneNumber, email, phoneSuffix, otp, _id } = req.body;
    try {
        if (email) {
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: "user not found" })
            }
            if (user.emailOtp !== otp) {
                return res.status(400).json({ message: "invalid otp" })
            }
            if (user.emailOtpExpiry < Date.now()) {
                return res.status(400).json({ message: "otp expired" })
            }
            user.isVerified = true;
            user.emailOtp = null;
            user.emailOtpExpiry = null;
            await user.save();
        }
        else {
            if (!phoneNumber || !phoneSuffix) {
                return res.status(400).json({ message: "phone number and phone suffix are required" })
            }
            const fullPhoneNumber = phoneSuffix + phoneNumber;
            const user = await User.findOne({ fullPhoneNumber })
            if (!user) {
                return res.status(400).json({ message: "user not found" })
            }
            const result = await checkOtpTOPhoneNumber(fullPhoneNumber, otp);
            if (!result.valid) {
                return res.status(400).json({ message: "invalid otp" })
            }
            user.isVerified = true;

            await user.save();
        }

        const token = generateJsonWebToken(_id, email);
        res.cookie("jwt", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })
        return res.status(200).json({ message: "otp verified successfully", token })

    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error +authcontroller+verifyOtp" })
    }
}
module.exports = { sendOtp, verifyOtp }
