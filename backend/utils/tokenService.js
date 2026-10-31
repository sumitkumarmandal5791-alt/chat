const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { hashToken } = require('./cryptoUtils');
const User = require('../models/User');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET_KEY || 'wa_jwt_access_secret_super_safe_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wa_jwt_refresh_secret_ultra_safe_key_2026';

const ACCESS_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_EXPIRES_IN = '7d';  // 7 days
const cookieSameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
const cookieSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';

/**
 * Generate Access Token (15 mins)
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            username: user.username
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
};

/**
 * Generate Refresh Token (7 days)
 */
const generateRefreshToken = (user) => {
    // Generate a unique token with high-entropy random uuid to ensure uniqueness
    const tokenId = crypto.randomUUID();
    return jwt.sign(
        {
            _id: user._id,
            jti: tokenId
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

/**
 * Set HTTP-Only Cookie for Refresh Token
 */
const setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        path: '/'
    });
};

/**
 * Clear Auth Cookies
 */
const clearAuthCookies = (res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        path: '/'
    };
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('jwt', cookieOptions);
    res.clearCookie('accessToken', cookieOptions);
};

/**
 * Register a new session or update an existing one on user document
 */
const registerSession = async (user, refreshToken, req) => {
    const refreshTokenHash = hashToken(refreshToken);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '0.0.0.0';

    let device = 'Web Browser';
    if (/mobile/i.test(userAgent)) device = 'Mobile Web';
    else if (/android/i.test(userAgent)) device = 'Android Device';
    else if (/iphone|ipad/i.test(userAgent)) device = 'iOS Device';
    else if (/windows/i.test(userAgent)) device = 'Windows Desktop';
    else if (/macintosh/i.test(userAgent)) device = 'Mac Desktop';
    else if (/linux/i.test(userAgent)) device = 'Linux Desktop';

    if (!user.sessions) user.sessions = [];

    // Limit maximum active sessions to 10
    if (user.sessions.length >= 10) {
        user.sessions.shift(); // remove oldest
    }

    user.sessions.push({
        refreshTokenHash,
        device,
        ip,
        userAgent: userAgent.slice(0, 150),
        lastActiveAt: new Date(),
        createdAt: new Date()
    });

    await user.save();
};

/**
 * Rotate Refresh Token: invalidates the old token and issues a new pair
 */
const rotateRefreshToken = async (oldRefreshToken, req) => {
    const decoded = verifyRefreshToken(oldRefreshToken);
    const user = await User.findById(decoded._id);
    if (!user) throw { status: 401, message: 'User associated with session not found' };

    const oldHash = hashToken(oldRefreshToken);
    const sessionIndex = user.sessions?.findIndex((s) => s.refreshTokenHash === oldHash);

    if (sessionIndex === -1 || sessionIndex === undefined) {
        // Reuse detection: If token was already revoked, purge all sessions for security!
        console.warn(`[SECURITY ALERT] Refresh token reuse detected for user ${user._id}! Clearing sessions.`);
        user.sessions = [];
        await user.save();
        throw { status: 403, message: 'Invalid session token. Please log in again.' };
    }

    // Remove old session
    user.sessions.splice(sessionIndex, 1);

    // Generate new pair
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Register new session
    await registerSession(user, newRefreshToken, req);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    setRefreshTokenCookie,
    clearAuthCookies,
    registerSession,
    rotateRefreshToken
};
