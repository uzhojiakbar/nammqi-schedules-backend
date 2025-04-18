const express = require("express");
const authRoutes = require("./auth/index");
const userRoutes = require("./user/index");
const adminRoutes = require("./admin/index");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/admin", adminRoutes);

router.get("/", (req, res) => {
  res.send("API WORKING!");
});

module.exports = router;
