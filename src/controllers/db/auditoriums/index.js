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
            creatorId: req.query.creatorId,
            department: req.query.department,
            capacity: req.query.capacity ? parseInt(req.query.capacity) : undefined,
            name: req.query.name,
        };


        getAuditoriumsByBuildingId(id, filters, (err, auditoriums) => {
            if (err) {
                if (err instanceof CustomError) {
                    return res.status(err.code).json({ error: err.message });
                }
                console.log("xato", err);
                return res.status(500).json({ error: "Server xatosi" });
            }

            const json = JSON.stringify(auditoriums); // yoki { size, auditoriums }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Length', Buffer.byteLength(json)); // bu yerda o‘lchov baytda
            res.status(200).send(json);

        });
    } catch (error) {
        const status = error.code || 400;
        res.status(status).json({ error: error.message });
    }

}


module.exports = {
    createAuditoriumController,
    getAuditoriumsByBuildingIdController
};
