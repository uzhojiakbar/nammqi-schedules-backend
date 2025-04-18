const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  filial: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  createBy: { type: String, default: "admin username" },
});

const Building = mongoose.model("Building", buildingSchema);

module.exports = Building;
