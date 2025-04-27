const express = require("express");
const BuildingRoutes = require("./buildings/index");

const router = express.Router();

router.use("/buildings", BuildingRoutes);
module.exports = router;
