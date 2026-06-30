const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API
});

const uploadFileTocloudinary = (file) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.buffer) {
            return reject(new Error("No file buffer available for upload."));
        }

        const options = {
            resource_type: "auto"
        };

        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                console.error("Cloudinary upload error:", error);
                return reject(error);
            }
            resolve(result);
        });

        stream.end(file.buffer);
    });
};

// Use memory storage instead of disk storage to avoid saving files locally
const storage = multer.memoryStorage();
const multerMiddleWare = multer({ storage }).single("media");

module.exports = {
    uploadFileTocloudinary,
    multerMiddleWare
};
