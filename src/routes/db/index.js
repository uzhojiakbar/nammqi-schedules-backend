const express = require("express");
const BuildingRoutes = require("./buildings/index");
const AuditoriumsRoutes = require("./auditoriums/index");
const SchedulesRoutes = require("./schedules/index");

const router = express.Router();

router.use("/buildings", BuildingRoutes);
router.use("/auditoriums", AuditoriumsRoutes);
router.use("/schedules", SchedulesRoutes);

module.exports = router;
