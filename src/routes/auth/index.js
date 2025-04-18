const express = require("express");
const {
  login,
  register,
  refreshToken,
  logout,
} = require("../../controllers/auth/index");
const { authenticateToken } = require("../../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/refresh-token", refreshToken);
router.post("/logout", authenticateToken, logout);

module.exports = router;
