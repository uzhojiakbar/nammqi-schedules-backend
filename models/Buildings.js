const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  floors: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: "admin" },
});

const Building = mongoose.model("Building", buildingSchema);

module.exports = Building;
