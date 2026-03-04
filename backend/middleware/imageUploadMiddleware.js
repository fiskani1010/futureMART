const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/jpg",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Only JPG, PNG, WEBP, and GIF files are allowed"));
    }

    return cb(null, true);
};

const imageUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

module.exports = imageUpload;
