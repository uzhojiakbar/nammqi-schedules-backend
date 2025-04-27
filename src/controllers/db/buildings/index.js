const { CustomError } = require("../../../components/customError");
const {
  db,
  createBuilding,
  getAllBuildings,
  deleteBuildingById,
} = require("../../../db/db");

function createBuildingController(req, res) {
  try {
    const building = req.body;

    console.log("USER DATA", req.userInfo);

    createBuilding(building, req.userInfo, (err, result) => {
      if (err) {
        if (err instanceof CustomError) {
          return res.status(err.code).json({ error: err.message });
        }
        return res.status(500).json({ error: "Server xatosi" });
      }

      res.status(201).json({
        message: "Bino muvaffaqiyatli qo'shildi",
        data: {
          id: result.id,
          creatorID: req?.userInfo?.id || null,
          ...building,
        },
      });
    });
  } catch (error) {
    const status = error.code || 400;
    res.status(status).json({ error: error.message });
  }
}

function getAllBuildingsController(req, res) {
  try {
    const filters = {
      name: req.query.name || null,
      address: req.query.address || null,
    };

    getAllBuildings(filters, (err, buildings) => {
      if (err) {
        return res.status(500).json({ error: "Server xatosi" });
      }

      res.status(200).json({
        buildings,
        totalCount: buildings.length,
      });
    });
  } catch (error) {
    const status = error.code || 400;
    res.status(status).json({ error: error.message });
  }
}

function deleteBuildingController(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Bino ID majburiy" });
    }

    deleteBuildingById(id, (err) => {
      if (err) {
        if (err instanceof CustomError) {
          return res.status(err.code).json({ error: err.message });
        }
        return res.status(500).json({ error: "Server xatosi" });
      }

      res.status(200).json({ message: "Bino muvaffaqiyatli o'chirildi" });
    });
  } catch (error) {
    const status = error.code || 400;
    res.status(status).json({ error: error.message });
  }
}
module.exports = {
  createBuildingController,
  getAllBuildingsController,
  deleteBuildingController,
};
