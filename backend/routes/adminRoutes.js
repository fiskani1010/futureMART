const express = require("express");
const router = express.Router();
const {
    getAdminHeroSlides,
    createHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
} = require("../controllers/heroSlideController");
const { getAdminUsers, updateUserRole } = require("../controllers/adminUserController");
const {
    getAdminProducts,
    createProduct,
    updateProduct,
    deleteProduct,
} = require("../controllers/productController");
const {
    getAdminTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
} = require("../controllers/teamMemberController");
const {
    getAdminNewArrivals,
    createNewArrival,
    updateNewArrival,
    deleteNewArrival,
} = require("../controllers/newArrivalController");
const { uploadAdminImage } = require("../controllers/uploadController");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");
const imageUpload = require("../middleware/imageUploadMiddleware");

router.use(authenticateToken, requireAdmin);

router.post("/upload-image", (req, res, next) => {
    imageUpload.single("image")(req, res, (err) => {
        if (!err) {
            return next();
        }

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Image must be 5MB or smaller" });
        }

        return res.status(400).json({ message: err.message || "Image upload failed" });
    });
}, uploadAdminImage);

router.get("/hero-slides", getAdminHeroSlides);
router.post("/hero-slides", createHeroSlide);
router.put("/hero-slides/:id", updateHeroSlide);
router.delete("/hero-slides/:id", deleteHeroSlide);
router.get("/users", getAdminUsers);
router.patch("/users/:id/role", updateUserRole);
router.get("/products", getAdminProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/team-members", getAdminTeamMembers);
router.post("/team-members", createTeamMember);
router.put("/team-members/:id", updateTeamMember);
router.delete("/team-members/:id", deleteTeamMember);
router.get("/new-arrivals", getAdminNewArrivals);
router.post("/new-arrivals", createNewArrival);
router.put("/new-arrivals/:id", updateNewArrival);
router.delete("/new-arrivals/:id", deleteNewArrival);

module.exports = router;
