const express = require("express");
const {
    createAuditoriumController,
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


module.exports = router;
