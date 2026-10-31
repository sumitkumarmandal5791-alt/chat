const { z } = require('zod');
const User = require('../models/User');
const Otp = require('../models/Otp');
const conversation = require('../models/conversation');
const {
    generateOtp,
    hashOtp,
    verifyOtpHash,
    parseAndNormalizeIdentifier,
    maskIdentifier,
    hashToken
} = require('../utils/cryptoUtils');
const { sendOtpEmail } = require('../services/emailService');
const { sendTwilioVerify, checkTwilioVerify, sendCustomSms } = require('../services/phoneService');
const {
    generateAccessToken,
    generateRefreshToken,
    setRefreshTokenCookie,
    clearAuthCookies,
    registerSession,
    rotateRefreshToken
} = require('../utils/tokenService');
const { uploadFileTocloudinary } = require('../src/cloudaniry');

// Validation Schemas
const sendOtpSchema = z.object({
    identifier: z.string().optional(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneSuffix: z.string().optional(),
    channel: z.enum(['email', 'sms', 'auto']).optional().default('auto')
});

const verifyOtpSchema = z.object({
    identifier: z.string().optional(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneSuffix: z.string().optional(),
    otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP too long')
});

const completeProfileSchema = z.object({
    username: z.string().trim().min(3, 'Username must be at least 3 characters').max(30),
    name: z.string().trim().max(50).optional(),
    about: z.string().max(140).optional(),
    profilePicture: z.string().optional()
});

/**
 * 1. POST /api/auth/send-otp
 * Generic response prevents user enumeration. Never leaks OTP.
 */
const sendOtp = async (req, res) => {
    try {
        const body = sendOtpSchema.parse(req.body);
        const rawInput = body.identifier || body.email || (body.phoneSuffix ? `${body.phoneSuffix}${body.phoneNumber}` : body.phoneNumber);

        if (!rawInput) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        const { type, normalized } = parseAndNormalizeIdentifier(rawInput, body.phoneSuffix || '+91');

        // Invalidate previous unverified OTPs for this identifier
        await Otp.deleteMany({ identifier: normalized, isVerified: false });

        let channel = body.channel === 'auto' ? (type === 'email' ? 'email' : 'sms') : body.channel;

        // Branch 1: Email OTP
        if (type === 'email' || channel === 'email') {
            channel = 'email';
            const plainOtp = generateOtp();
            const otpHash = hashOtp(plainOtp);

            // Send Email (without logging the OTP)
            await sendOtpEmail(normalized, plainOtp);

            // Store hashed OTP with 5 min TTL
            await Otp.create({
                identifier: normalized,
                otpHash,
                channel: 'email',
                purpose: 'auth',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });

            return res.status(200).json({
                success: true,
                message: `Verification code sent to ${maskIdentifier(normalized)}`,
                channel: 'email',
                maskedIdentifier: maskIdentifier(normalized),
                identifier: normalized
            });
        }

        // Branch 2: Phone OTP (SMS)
        channel = 'sms';
        const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_SERVICES_ID;

        if (verifySid && !verifySid.includes('your_')) {
            // Option A: Twilio Verify API
            await sendTwilioVerify(normalized);

            await Otp.create({
                identifier: normalized,
                otpHash: 'twilio_managed',
                channel: 'twilio_verify',
                purpose: 'auth',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });
        } else {
            // Option B: Custom OTP via Twilio SMS
            const plainOtp = generateOtp();
            const otpHash = hashOtp(plainOtp);

            await sendCustomSms(normalized, plainOtp);

            await Otp.create({
                identifier: normalized,
                otpHash,
                channel: 'sms',
                purpose: 'auth',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });
        }

        return res.status(200).json({
            success: true,
            message: `Verification code sent to ${maskIdentifier(normalized)} via SMS`,
            channel: 'sms',
            maskedIdentifier: maskIdentifier(normalized),
            identifier: normalized
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
        }
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Failed to send verification code' });
    }
};

/**
 * 2. POST /api/auth/verify-otp
 * Validates OTP with constant-time comparison, limits attempts, issues access/refresh tokens.
 */
const verifyOtp = async (req, res) => {
    try {
        const body = verifyOtpSchema.parse(req.body);
        const rawInput = body.identifier || body.email || (body.phoneSuffix ? `${body.phoneSuffix}${body.phoneNumber}` : body.phoneNumber);

        if (!rawInput) {
            return res.status(400).json({ message: 'Identifier is required' });
        }

        const { type, normalized } = parseAndNormalizeIdentifier(rawInput, body.phoneSuffix || '+91');
        const candidateOtp = body.otp.trim();

        // Find active OTP record
        const otpRecord = await Otp.findOne({
            identifier: normalized,
            isVerified: false
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({ message: 'No verification code was requested for this identifier or it has expired.' });
        }

        // Check expiration
        if (new Date() > otpRecord.expiresAt) {
            await Otp.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
        }

        // Check attempts limit (max 5)
        if (otpRecord.attempts >= 5) {
            await Otp.deleteOne({ _id: otpRecord._id });
            return res.status(423).json({
                message: 'Too many incorrect attempts. This code is now locked. Please request a new one.'
            });
        }

        let isApproved = false;

        if (otpRecord.channel === 'twilio_verify') {
            // Verify via Twilio Verify
            const result = await checkTwilioVerify(normalized, candidateOtp);
            isApproved = result.isValid;
        } else {
            // Verify via constant-time hash comparison
            isApproved = verifyOtpHash(candidateOtp, otpRecord.otpHash);
        }

        if (!isApproved) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            const remaining = 5 - otpRecord.attempts;
            return res.status(400).json({
                message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            });
        }

        // Mark OTP verified & consume it
        await Otp.deleteOne({ _id: otpRecord._id });

        // Find or create User
        let user = null;
        if (type === 'email') {
            user = await User.findOne({ email: normalized });
            if (!user) {
                user = new User({ email: normalized, isVerified: true });
            } else {
                user.isVerified = true;
            }
        } else {
            user = await User.findOne({ phoneNumber: normalized });
            if (!user) {
                user = new User({ phoneNumber: normalized, isVerified: true });
            } else {
                user.isVerified = true;
            }
        }

        const isNewUser = !user.username;

        // Generate Tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store session in DB
        await registerSession(user, refreshToken, req);

        // Set secure HTTP-only cookie
        setRefreshTokenCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            message: 'Authentication successful',
            accessToken,
            isNewUser,
            user: {
                _id: user._id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                name: user.name,
                username: user.username,
                profilePicture: user.profilePicture,
                about: user.about,
                isVerified: user.isVerified
            }
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
        }
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'OTP verification failed' });
    }
};

/**
 * 3. POST /api/auth/resend-otp
 */
const resendOtp = async (req, res) => {
    return sendOtp(req, res);
};

/**
 * 4. POST /api/auth/complete-profile
 */
const completeProfile = async (req, res) => {
    try {
        const body = completeProfileSchema.parse(req.body);
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if username is already taken by another user
        const existingUsername = await User.findOne({
            username: body.username,
            _id: { $ne: userId }
        });
        if (existingUsername) {
            return res.status(409).json({ message: 'Username is already taken. Please choose another.' });
        }

        user.username = body.username;
        if (body.name) user.name = body.name;
        if (body.about) user.about = body.about;

        // Cloudinary file upload if image was uploaded
        if (req.file) {
            try {
                const uploadResult = await uploadFileTocloudinary(req.file);
                if (uploadResult?.secure_url) {
                    user.profilePicture = uploadResult.secure_url;
                }
            } catch (upErr) {
                console.warn('Profile picture upload failed, falling back:', upErr.message);
            }
        } else if (body.profilePicture) {
            user.profilePicture = body.profilePicture;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile completed successfully',
            user: {
                _id: user._id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                name: user.name,
                username: user.username,
                profilePicture: user.profilePicture,
                about: user.about,
                isVerified: user.isVerified
            }
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
        }
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Failed to update profile' });
    }
};

/**
 * 5. POST /api/auth/refresh
 * Rotates the refresh token and issues a fresh 15-min access token
 */
const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' });
        }

        const { accessToken, refreshToken: newRefreshToken, user } = await rotateRefreshToken(token, req);

        // Update HTTP-only cookie with rotated token
        setRefreshTokenCookie(res, newRefreshToken);

        return res.status(200).json({
            success: true,
            accessToken,
            user: {
                _id: user._id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                name: user.name,
                username: user.username,
                profilePicture: user.profilePicture,
                about: user.about
            }
        });
    } catch (err) {
        clearAuthCookies(res);
        const status = err.status || 401;
        return res.status(status).json({ message: err.message || 'Invalid or expired session', code: 'REFRESH_FAILED' });
    }
};

/**
 * 6. POST /api/auth/logout
 * Clears cookies and revokes the active device session
 */
const logout = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token && req.user?._id) {
            const tokenH = hashToken(token);
            await User.findByIdAndUpdate(req.user._id, {
                $pull: { sessions: { refreshTokenHash: tokenH } },
                $set: { isOnline: false, lastSeen: new Date() }
            });
        }
        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: 'Logged out' });
    }
};

/**
 * 7. POST /api/auth/logout-all
 * Revokes all sessions across all devices for this user
 */
const logoutAll = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (userId) {
            await User.findByIdAndUpdate(userId, {
                $set: { sessions: [], isOnline: false, lastSeen: new Date() }
            });
        }
        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: 'All device sessions terminated' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to terminate all sessions' });
    }
};

/**
 * 8. GET /api/auth/me
 * Returns current user data and active sessions list
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-sessions.refreshTokenHash').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            user,
            sessions: user.sessions || []
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to retrieve profile' });
    }
};

/**
 * 9. Legacy Profile & User endpoints preserved for chats and contacts
 */
const checkAuthenticated = async (req, res) => {
    return getMe(req, res);
};

const updateProfile = async (req, res) => {
    return completeProfile(req, res);
};

const getAllUsers = async (req, res) => {
    const loggedInUserId = req.user._id;
    try {
        const users = await User.find({ _id: { $ne: loggedInUserId } })
            .select('username name profilePicture about lastSeen isOnline email phoneNumber')
            .lean();

        const usersConversation = await Promise.all(
            users.map(async (u) => {
                const conv = await conversation.findOne({
                    participants: { $all: [loggedInUserId, u._id] }
                }).populate({
                    path: 'lastMessage',
                    select: 'message createdAt senderId receiverId contentType'
                }).lean();

                return {
                    ...u,
                    conversation: conv || null
                };
            })
        );
        return res.status(200).json({ message: 'Users fetched successfully', users: usersConversation });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to get users' });
    }
};

module.exports = {
    sendOtp,
    verifyOtp,
    resendOtp,
    completeProfile,
    updateProfile,
    refreshToken,
    logout,
    logoutAll,
    getMe,
    checkAuthenticated,
    getAllUsers
};
