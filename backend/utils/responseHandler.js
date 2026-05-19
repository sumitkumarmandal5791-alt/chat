const responseHandler = (res, statusCode, message, data) => {

    if (!res || !statusCode || !message || !data) {
        console.log("Please send proper response");
        return;
    }
    return res.status(statusCode).json({
        status: success,
        statusCode,
        message,
        data
    })
}
module.exports = responseHandler;