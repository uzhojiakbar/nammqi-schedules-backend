const express = require("express");
const BuildingRoutes = require("./buildings/index");
const AuditoriumsRoutes = require("./auditoriums/index");

const router = express.Router();

router.use("/buildings", BuildingRoutes);
router.use("/auditoriums", AuditoriumsRoutes);

module.exports = router;
