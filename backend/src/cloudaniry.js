const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API
});

// Existing upload helper (preserved for profile and backward compatibility)
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

/**
 * Generate signed upload parameters for direct client-to-Cloudinary upload
 */
const generateUploadSignature = (folder = "status_media") => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
        folder,
        timestamp
    };

    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API;
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_NAME,
        folder
    };
};

/**
 * Fetch and verify asset metadata directly from Cloudinary server-side
 */
const verifyAndGetResource = async (publicId, resourceType = "image") => {
    try {
        const resource = await cloudinary.api.resource(publicId, {
            resource_type: resourceType
        });
        return resource;
    } catch (error) {
        // Fallback check with auto/video if image didn't match
        try {
            const altType = resourceType === "image" ? "video" : "image";
            const resource = await cloudinary.api.resource(publicId, {
                resource_type: altType
            });
            return resource;
        } catch (innerError) {
            console.error("Cloudinary resource verification error:", error.message);
            throw new Error(`Cloudinary asset not found or verification failed: ${error.message}`);
        }
    }
};

/**
 * Safely destroy an asset on Cloudinary
 */
const destroyResource = async (publicId, resourceType = "image") => {
    if (!publicId) return null;
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true
        });
        return result;
    } catch (error) {
        console.error(`Failed to destroy Cloudinary resource (${publicId}):`, error.message);
        return null;
    }
};

const storage = multer.memoryStorage();
const multerMiddleWare = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
            return callback(null, true);
        }
        return callback(new Error("Only image and video files are supported"));
    }
}).single("media");

module.exports = {
    cloudinary,
    uploadFileTocloudinary,
    generateUploadSignature,
    verifyAndGetResource,
    destroyResource,
    multerMiddleWare
};
