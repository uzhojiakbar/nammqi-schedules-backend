const express = require("express");
const { db } = require("../../db/db");
const { authenticateToken } = require("../../middleware/auth");
const {
  getMe,
  deleteMe,
  comparePassword,
  changePassword,
  updateProfile,
} = require("../../controllers/user");

const router = express.Router();

router.get("/me", authenticateToken, getMe);
router.delete("/me", authenticateToken, deleteMe);
router.post("/compare-password", authenticateToken, comparePassword);
router.patch("/password/change", authenticateToken, changePassword);
router.patch("/profile", authenticateToken, updateProfile);

module.exports = router;
