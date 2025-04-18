const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const {
  addBuilding,
  getBuildings,
} = require("../controllers/buildingController");

const router = express.Router();

router.post("/", verifyToken, isAdmin, addBuilding);
router.get("/", verifyToken, getBuildings);

module.exports = router;
