const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_SERVICES_ID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (accountSid && authToken && !accountSid.includes('your_') && !authToken.includes('your_')) {
    try {
        twilioClient = twilio(accountSid, authToken);
    } catch (e) {
        console.warn('⚠️  [TWILIO WARNING] Could not initialize Twilio client:', e.message);
    }
}

/**
 * Maps Twilio error codes to user-friendly and actionable messages
 */
const mapTwilioError = (error) => {
    const code = error.code || error.status;
    switch (code) {
        case 21608:
            return {
                status: 400,
                message: 'This phone number is unverified on Twilio Trial account. In trial mode, SMS can only be sent to pre-verified numbers in your Twilio Console.'
            };
        case 21211:
            return {
                status: 400,
                message: 'Invalid phone number format. Please ensure valid international E.164 format (e.g. +91 9876543210).'
            };
        case 60203:
            return {
                status: 429,
                message: 'Max verification attempts reached for this number. Please wait a while before requesting again.'
            };
        case 20003:
            return {
                status: 502,
                message: 'Twilio authentication failed. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
            };
        case 21610:
            return {
                status: 403,
                message: 'The recipient phone number has opted out or is blacklisted from receiving SMS.'
            };
        default:
            return {
                status: 502,
                message: error.message || 'SMS delivery failed through gateway. You can try Email verification instead.'
            };
    }
};

/**
 * Option A (Recommended): Send verification code using Twilio Verify API
 */
const sendTwilioVerify = async (e164PhoneNumber) => {
    if (!twilioClient || !verifyServiceSid) {
        throw {
            status: 503,
            message: 'Twilio Verify service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.'
        };
    }
    try {
        const verification = await twilioClient.verify.v2
            .services(verifyServiceSid)
            .verifications.create({
                to: e164PhoneNumber,
                channel: 'sms'
            });
        return { status: verification.status, sid: verification.sid };
    } catch (err) {
        console.error('Twilio Verify error for phone:', e164PhoneNumber.slice(0, 5) + '••••' + e164PhoneNumber.slice(-2), err.message);
        throw mapTwilioError(err);
    }
};

/**
 * Option A Check: Verify OTP code with Twilio Verify API
 */
const checkTwilioVerify = async (e164PhoneNumber, code) => {
    if (!twilioClient || !verifyServiceSid) {
        throw {
            status: 503,
            message: 'Twilio Verify service is not configured.'
        };
    }
    try {
        const verificationCheck = await twilioClient.verify.v2
            .services(verifyServiceSid)
            .verificationChecks.create({
                to: e164PhoneNumber,
                code: String(code).trim()
            });

        return {
            isValid: verificationCheck.status === 'approved',
            status: verificationCheck.status
        };
    } catch (err) {
        console.error('Twilio check error:', err.message);
        throw mapTwilioError(err);
    }
};

/**
 * Option B: Send custom 6-digit OTP via Twilio Programmable SMS (client.messages.create)
 */
const sendCustomSms = async (e164PhoneNumber, otp) => {
    if (!twilioClient || !twilioPhoneNumber) {
        throw {
            status: 503,
            message: 'Twilio Programmable SMS is not configured. Please set TWILIO_PHONE_NUMBER.'
        };
    }
    const appName = process.env.APP_NAME || 'WhatsApp Web';
    const body = `${otp} is your ${appName} verification code. It expires in 5 minutes.`;

    try {
        const message = await twilioClient.messages.create({
            body,
            from: twilioPhoneNumber,
            to: e164PhoneNumber
        });
        return { sid: message.sid, status: message.status };
    } catch (err) {
        console.error('Twilio SMS error:', err.message);
        throw mapTwilioError(err);
    }
};

module.exports = {
    sendTwilioVerify,
    checkTwilioVerify,
    sendCustomSms
};

