const { CustomError } = require("../../../components/customError");

const {
    db,
    createAuditorium
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



module.exports = {
    createAuditoriumController
};
