const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    authorizeAdmin,
} = require("../../../middleware/auth");
const { addScheduleController, getWeeklyScheduleController } = require("../../../controllers/db/schedules");



router.post("/", authenticateToken, authorizeAdmin, addScheduleController);
router.get("/", getWeeklyScheduleController);



module.exports = router;
