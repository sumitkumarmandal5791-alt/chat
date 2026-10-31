const Otp = require('../models/Otp');

// In-memory rate limiting store for IP requests: ip -> [{ timestamp }]
const ipRequestWindow = new Map();

// Helper to clean up expired timestamps
const pruneWindow = (timestamps, windowMs) => {
    const now = Date.now();
    return timestamps.filter((t) => now - t < windowMs);
};

/**
 * 1. Cooldown & Hourly Limit Check for OTP generation
 * - 60s resend cooldown per identifier
 * - Max 5 OTPs per hour per identifier
 * - Max 10 OTP requests per hour per IP
 */
const otpRateLimiter = async (req, res, next) => {
    try {
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        // Check IP limit
        let ipEntries = ipRequestWindow.get(clientIp) || [];
        ipEntries = pruneWindow(ipEntries, oneHour);
        if (ipEntries.length >= 10) {
            return res.status(429).json({
                message: 'Too many requests from this IP address. Please wait an hour before trying again.'
            });
        }

        const identifier = (req.body.identifier || req.body.email || req.body.phoneNumber || '').trim().toLowerCase();
        if (!identifier) {
            return next();
        }

        // Check last OTP for this identifier in MongoDB
        const recentOtps = await Otp.find({
            identifier,
            createdAt: { $gte: new Date(now - oneHour) }
        }).sort({ createdAt: -1 });

        // Cooldown check (60 seconds)
        if (recentOtps.length > 0) {
            const latest = recentOtps[0];
            const elapsedMs = now - new Date(latest.createdAt).getTime();
            const cooldownMs = 60 * 1000;

            if (elapsedMs < cooldownMs) {
                const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
                return res.status(429).json({
                    message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
                    retryAfter: remainingSeconds
                });
            }
        }

        // Hourly limit check (Max 5 per hour)
        if (recentOtps.length >= 5) {
            return res.status(429).json({
                message: 'Maximum verification code requests exceeded for this hour. Please try again later.'
            });
        }

        // Record request for IP
        ipEntries.push(now);
        ipRequestWindow.set(clientIp, ipEntries);

        next();
    } catch (err) {
        console.error('Rate limiter error:', err);
        next();
    }
};

module.exports = {
    otpRateLimiter
};

