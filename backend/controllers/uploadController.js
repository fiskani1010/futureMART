const { v2: cloudinary } = require("cloudinary");

const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};

const isCloudinaryConfigured = Object.values(cloudinaryConfig).every(Boolean);

if (isCloudinaryConfigured) {
    cloudinary.config(cloudinaryConfig);
}

exports.uploadAdminImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
    }

    if (!isCloudinaryConfigured) {
        return res.status(500).json({
            message:
                "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        });
    }

    try {
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        const uploadResult = await cloudinary.uploader.upload(dataUri, {
            folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "futuremart",
            resource_type: "image",
        });

        return res.status(201).json({
            message: "Image uploaded successfully",
            url: uploadResult.secure_url,
            absolute_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
        });
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        return res.status(500).json({ message: "Could not upload image." });
    }
};
