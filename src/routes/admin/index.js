const express = require("express");
const { authenticateToken, authorizeAdmin } = require("../../middleware/auth");
const { getAllUsers } = require("../../controllers/admin");

const router = express.Router();

router.get("/users", authenticateToken, authorizeAdmin, getAllUsers);

module.exports = router;
