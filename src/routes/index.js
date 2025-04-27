const express = require("express");
const authRoutes = require("./auth/index");
const userRoutes = require("./user/index");
const adminRoutes = require("./admin/index");
const DatabaseRoutes = require("./db/index");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/db", DatabaseRoutes);

router.get("/", (req, res) => {
  res.send("API WORKING!");
});

module.exports = router;
