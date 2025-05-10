const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
    createAuditoriumController,
    getAuditoriumsByBuildingIdController,
    deleteAuditoriumsByBuildingIdController,
    createAuditoriumsFromExcelController,
} = require("../../../controllers/db/auditoriums/index.js");
const {
    authenticateToken,
    authorizeAdmin,
} = require("../../../middleware/auth");


router.post(
    "/add",
    authenticateToken,
    authorizeAdmin,
    createAuditoriumController
);

const upload = multer({ dest: "uploads/" }); // vaqtincha yuklash
router.post(
    "/add-bulk",
    authenticateToken,
    authorizeAdmin,
    upload.single("file"),
    createAuditoriumsFromExcelController
);


router.get(
    "/buildingID/:id",
    getAuditoriumsByBuildingIdController
);


router.delete(
    "/buildingID/:id",
    authenticateToken,
    authorizeAdmin,
    deleteAuditoriumsByBuildingIdController
);


module.exports = router;
