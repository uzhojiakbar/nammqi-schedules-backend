const Building = require("../models/Buildings");

exports.addBuilding = async (req, res) => {
  const { name, filial } = req.body;
  try {
    console.log(req.user);
    const newBuild = new Building({
      name,
      filial,
      createBy: req.user.username,
    });
    await newBuild.save();
    res
      .status(201)
      .json({ message: "Bino muvaffaqiyatli ro'yxatdan qo'shildi" });
  } catch (error) {
    res.status(400).json({ error: "Bino  qo'shishda xatolik" });
  }
};

exports.getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find(); // Parollarni ko'rsatmaslik
    console.log(buildings);
    res.status(200).json(buildings);
    res.status(201).json({ message: "Binolar jonatildi!" });
  } catch (error) {
    res.status(400).json({ error: "Bino jonatishda xatolik" });
  }
};
