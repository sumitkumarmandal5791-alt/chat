const User = require("../models/User")
const otpGenerate = require('../utils/otpGenerate');
const sendOtpToEmail = require('../services/emial');
const { sendOtpTOPhoneNumber, checkOtpTOPhoneNumber } = require("../services/phone")
const generateJsonWebToken = require("../utils/jsonWebToken");
const { uploadFileTocloudinary } = require("../src/cloudaniry");
const conversation = require("../models/conversation")

const sendOtp = async (req, res) => {
    const { phoneNumber, email, phoneSuffix } = req.body;

    const otp = otpGenerate();

    const expiryTime = Date.now() + 10 * 60 * 1000;


    try {

        if (email) {

            let user = await User.findOne({ email })

            if (!user) {
                user = new User({ email })
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


        const suffixStr = String(phoneSuffix);
        const formattedSuffix = suffixStr.startsWith('+') ? suffixStr : '+' + suffixStr;
        const fullPhoneNumber = formattedSuffix + phoneNumber;

        let user = await User.findOne({ phoneNumber, phoneSuffix })

        if (!user) {
            user = new User({ fullPhoneNumber, phoneSuffix, phoneNumber })
        }
        await sendOtpTOPhoneNumber(fullPhoneNumber);
        await user.save();
        return res.status(200).json({ message: "otp send successfully" })
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
        let user
        if (email) {
            user = await User.findOne({ email })
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
            const suffixStr = String(phoneSuffix);
            const formattedSuffix = suffixStr.startsWith('+') ? suffixStr : '+' + suffixStr;
            const fullPhoneNumber = formattedSuffix + phoneNumber;
            user = await User.findOne({ phoneNumber, phoneSuffix })
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

        req.user = user;
        const token = generateJsonWebToken(user._id, email);
        res.cookie("jwt", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })
        return res.status(200).json({ message: "otp verified successfully", token, user })

    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error +authcontroller+verifyOtp" })
    }
}

const updateProfile = async (req, res) => {


    const { username, agreed, about } = req.body;

    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        const file = req.file;

        if (file) {
            const uploadResult = await uploadFileTocloudinary(file)
            user.profilePicture = uploadResult.secure_url;
        }
        else if (req.body.profilePicture) {
            user.profilePicture = req.body.profilePicture;
        }
        if (username) user.username = username
        if (agreed) user.agreed = agreed;
        if (about) user.about = about;
        await user.save();

        return res.status(200).json({ message: "user profile uploaded sucessfully", user })
    }
    catch (error) {
        return res.status(500).json({ message: "intrenal server error in profile update" })
    }
}

const checkAuthenticated = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({ message: "not authorised" })
        }
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        return res.status(200).json({ message: "valid user", user })
    }
    catch (error) {
        return res.status(500).json({ message: "internal server error check authenticated" })
    }
}


const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { expires: new Date(0), httpOnly: true });
        return res.status(200).json({ message: "user logout sucessfully" })
    } catch (error) {
        return res.status(500).json({ message: "intrenal server error" })
    }
}

const getAllUsers = async (req, res) => {

    const loggedInUserId = req.user._id;
    try {
        const users = await User.find({ _id: { $ne: loggedInUserId } }).select("username profilePicture about lastSeen isOnline ").lean();
        const usersConversation = await Promise.all(
            users.map(async (user) => {
                const userConversation = await conversation.findOne({
                    participants: { $all: [loggedInUserId, user._id] }
                }).populate({
                    path: "lastMessage",
                    select: "content createdAt sendser receiver"
                }).lean();
                return {
                    ...user,
                    conversation: userConversation || null
                }
            })
        )
        return res.status(200).json({ message: "users fetched successfully", users: usersConversation })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error get all users" })
    }

}


module.exports = { sendOtp, verifyOtp, updateProfile, checkAuthenticated, logout, getAllUsers }
