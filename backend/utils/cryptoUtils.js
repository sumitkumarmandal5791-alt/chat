const crypto = require('crypto');

const OTP_PEPPER = process.env.OTP_PEPPER || process.env.JWT_ACCESS_SECRET || 'wa_otp_secure_pepper_default';

/**
 * Generate cryptographically secure 6-digit OTP (100000 - 999999)
 */
const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash an OTP using SHA-256 and pepper
 */
const hashOtp = (otp) => {
    return crypto
        .createHmac('sha256', OTP_PEPPER)
        .update(String(otp).trim())
        .digest('hex');
};

/**
 * Constant-time comparison of plaintext OTP against stored hash
 */
const verifyOtpHash = (candidateOtp, storedHash) => {
    if (!candidateOtp || !storedHash) return false;
    const candidateHash = hashOtp(candidateOtp);
    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (candidateBuffer.length !== storedBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
};

/**
 * Hash a session refresh token for safe storage in database
 */
const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

/**
 * Detect and normalize identifier (email or phone)
 * @returns {{ type: 'email' | 'phone', normalized: string }}
 */
const parseAndNormalizeIdentifier = (input, defaultCountryCode = '+91') => {
    if (!input || typeof input !== 'string') {
        throw { status: 400, message: 'Invalid identifier provided' };
    }

    const trimmed = input.trim();

    // Check if email
    if (trimmed.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedEmail = trimmed.toLowerCase();
        if (!emailRegex.test(normalizedEmail)) {
            throw { status: 400, message: 'Please provide a valid email address' };
        }
        return { type: 'email', normalized: normalizedEmail };
    }

    // Phone normalization to E.164
    let cleanPhone = trimmed.replace(/[\s\-()]/g, '');
    if (!cleanPhone.startsWith('+')) {
        // Prepend default country code if missing
        const prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
        cleanPhone = `${prefix}${cleanPhone}`;
    }

    // E.164 format: + followed by 7 to 15 digits
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(cleanPhone)) {
        throw { status: 400, message: 'Invalid phone number. Please include valid country code (e.g. +91 9876543210)' };
    }

    return { type: 'phone', normalized: cleanPhone };
};

/**
 * Mask an identifier for secure frontend display (e.g. "+91 98••••••10" or "j••••@gmail.com")
 */
const maskIdentifier = (identifier) => {
    if (!identifier) return '';
    if (identifier.includes('@')) {
        const [local, domain] = identifier.split('@');
        if (local.length <= 2) return `${local[0]}•••@${domain}`;
        return `${local.slice(0, 2)}••••${local.slice(-1)}@${domain}`;
    }
    // Phone
    if (identifier.length <= 5) return '••••••';
    return `${identifier.slice(0, 4)} •••• ••${identifier.slice(-2)}`;
};

module.exports = {
    generateOtp,
    hashOtp,
    verifyOtpHash,
    hashToken,
    parseAndNormalizeIdentifier,
    maskIdentifier
};

