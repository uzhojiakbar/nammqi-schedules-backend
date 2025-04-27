const express = require("express");
const {
  createBuildingController,
  getAllBuildingsController,
  deleteBuildingController,
} = require("../../../controllers/db/buildings");
const {
  authenticateToken,
  authorizeAdmin,
} = require("../../../middleware/auth");

const router = express.Router();

router.post(
  "/add",
  authenticateToken,
  authorizeAdmin,
  createBuildingController
);

router.get("/all", getAllBuildingsController);

router.delete(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  deleteBuildingController
);

module.exports = router;
