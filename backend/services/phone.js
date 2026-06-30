const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const servicesid = process.env.TWILIO_SERVICES_ID;

const client = twilio(accountSid, authToken);

const sendOtpTOPhoneNumber = async (phoneNumber) => {
    try {
        if (!phoneNumber) {
            throw new Error("Phone Number is required")
        }
        const response = await client.verify.v2.services(servicesid).verifications.create({
            to: phoneNumber,
            channel: "sms"
        })
        return response;
    }
    catch (error) {
        console.error("Error in sendOtpTOPhoneNumber:", error);
        throw error;
    }
}

const checkOtpTOPhoneNumber = async (phoneNumber, otp) => {
    try {

        const response = await client.verify.v2.services(servicesid).verificationChecks.create({
            to: phoneNumber,
            code: otp
        })
        return response;
    }
    catch (error) {
        console.error("Error in checkOtpTOPhoneNumber:", error);
        throw error;
    }
}

module.exports = { sendOtpTOPhoneNumber, checkOtpTOPhoneNumber };