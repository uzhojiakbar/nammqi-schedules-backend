const express = require("express");
const {
    createAuditoriumController,
    getAuditoriumsByBuildingIdController,
} = require("../../../controllers/db/auditoriums/index.js");
const {
    authenticateToken,
    authorizeAdmin,
} = require("../../../middleware/auth");

const router = express.Router();

router.post(
    "/add",
    authenticateToken,
    authorizeAdmin,
    createAuditoriumController
);


router.get(
    "/buildingID/:id",
    getAuditoriumsByBuildingIdController
);


module.exports = router;
