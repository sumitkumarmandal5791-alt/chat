const multer = require("multer")
const cloudinary = require("cloudinary").v2
const fs = require("fs");


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API
});

const uploadFileTocloudinary = (file) => {
    return new Promise((resolve, reject) => {
        // If Cloudinary credentials are not provided, fallback to serving locally
        if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API) {
            console.log("Cloudinary credentials missing. Using local storage fallback.");
            const ext = file.originalname ? file.originalname.split('.').pop() : 'png';
            const newFilename = `${file.filename}.${ext}`;
            const newPath = `uploads/${newFilename}`;
            try {
                fs.renameSync(file.path, newPath);
                const localUrl = `http://localhost:${process.env.PORT || 1200}/uploads/${newFilename}`;
                return resolve({ secure_url: localUrl });
            } catch (err) {
                console.error("Local storage fallback error:", err);
                return reject(err);
            }
        }

        const options = {
            resource_type: file.mimetype.startsWith("video") ? "video" : "image"
        }
        const uplaoder = file.mimetype.startsWith("video") ? cloudinary.uploader.upload_large : cloudinary.uploader.upload;
        uplaoder(file.path, options, (error, result) => {
            try {
                fs.unlinkSync(file.path);
            } catch (e) {
                console.error("Error unlinking file:", e);
            }

            if (error) {
                return reject(error);
            }
            resolve(result)
        })
    })
}
const multerMiddleWare = multer({ dest: "uploads/" }).single("media")

module.exports = {
    uploadFileTocloudinary,
    multerMiddleWare
}


