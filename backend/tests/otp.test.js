const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    generateOtp,
    hashOtp,
    verifyOtpHash,
    parseAndNormalizeIdentifier,
    maskIdentifier
} = require('../utils/cryptoUtils');

describe('OTP Crypto & Security Utilities', () => {
    it('1. generateOtp should produce a 6-digit numeric string', () => {
        for (let i = 0; i < 20; i++) {
            const otp = generateOtp();
            assert.match(otp, /^\d{6}$/);
            const num = parseInt(otp, 10);
            assert.ok(num >= 100000 && num < 1000000);
        }
    });

    it('2. hashOtp and verifyOtpHash should perform constant-time verification', () => {
        const otp = '849201';
        const hash = hashOtp(otp);

        assert.strictEqual(typeof hash, 'string');
        assert.strictEqual(hash.length, 64); // SHA-256 produces 64 hex chars

        // Valid OTP verification
        assert.strictEqual(verifyOtpHash('849201', hash), true);

        // Invalid candidates
        assert.strictEqual(verifyOtpHash('849202', hash), false);
        assert.strictEqual(verifyOtpHash('123456', hash), false);
        assert.strictEqual(verifyOtpHash('', hash), false);
    });

    it('3. parseAndNormalizeIdentifier should properly normalize email and E.164 phone', () => {
        // Email normalization
        const emailTest = parseAndNormalizeIdentifier('  User.NAME@Gmail.COM  ');
        assert.strictEqual(emailTest.type, 'email');
        assert.strictEqual(emailTest.normalized, 'user.name@gmail.com');

        // Phone normalization with default +91
        const phoneTest = parseAndNormalizeIdentifier('9876543210', '+91');
        assert.strictEqual(phoneTest.type, 'phone');
        assert.strictEqual(phoneTest.normalized, '+919876543210');

        // International phone already starting with +
        const usPhone = parseAndNormalizeIdentifier('+1 (555) 234-5678');
        assert.strictEqual(usPhone.type, 'phone');
        assert.strictEqual(usPhone.normalized, '+15552345678');
    });

    it('4. maskIdentifier should securely obscure identifiers', () => {
        assert.strictEqual(maskIdentifier('+919876543210'), '+919 •••• ••10');
        assert.strictEqual(maskIdentifier('alexandra@example.com'), 'al••••a@example.com');
    });
});
