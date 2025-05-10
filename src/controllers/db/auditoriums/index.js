const { CustomError } = require("../../../components/customError");

const {
    db,
    createAuditorium,
    getAuditoriumsByBuildingId
} = require("../../../db/db");


const createAuditoriumController = (req, res) => {
    try {
        const auditorium = req.body;

        createAuditorium(auditorium, req.userInfo, (err, result) => {
            if (err) {
                if (err instanceof CustomError) {
                    return res.status(err.code).json({ error: err.message });
                }
                return res.status(500).json({ error: "Server xatosi" });
            }

            res.status(201).json({
                message: "Auditoriya muvaffaqiyatli qo'shildi",
                data: {
                    id: result.id,
                },
            });
        });
    } catch (error) {
        const status = error.code || 400;
        res.status(status).json({ error: error.message });
    }

}


const getAuditoriumsByBuildingIdController = (req, res) => {
    try {
        const { id } = req.params;

        const filters = {
            creatorId: req.query.creatorId || undefined,
            department: req.query.department || undefined,
            capacity: req.query.capacity ? parseInt(req.query.capacity) : undefined,
            name: req.query.name || undefined,
        };

        const page = parseInt(req.query.page, 10) || 1;
        const size = parseInt(req.query.size, 10) || 10;

        getAuditoriumsByBuildingId(id, filters, page, size, (err, auditoriums, paginationInfo) => {
            if (err) {
                if (err instanceof CustomError) {
                    return res.status(err.code).json({ error: err.message });
                }
                console.error("Xatolik:", err);
                return res.status(500).json({ error: "Server xatosi yuz berdi" });
            }

            const responseBody = {
                auditoriums,
                ...paginationInfo
            };

            const json = JSON.stringify(responseBody);
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Length", Buffer.byteLength(json, "utf8"));
            res.status(200).send(json);
        });
    } catch (error) {
        const status = error.code || 400;
        res.status(status).json({ error: error.message || "Nomaʼlum xatolik" });
    }
};



module.exports = {
    createAuditoriumController,
    getAuditoriumsByBuildingIdController
};
