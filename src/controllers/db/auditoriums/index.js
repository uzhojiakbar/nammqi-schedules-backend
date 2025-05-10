const { CustomError } = require("../../../components/customError");

const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");


const {
    db,
    createAuditorium,
    getAuditoriumsByBuildingId,
    deleteAuditoriumsByBuildingId,
    getBuildingIdByName,
    getAuditoriumById,
    deleteAuditoriumById,
    updateAuditoriumById
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

const createAuditoriumsFromExcelController = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Excel fayl yuborilmadi" });
        }

        const filePath = path.resolve(req.file.path);
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const rows = rawData.slice(1).filter(row => {
            return Array.isArray(row) && row.some(cell => cell !== null && cell !== "");
        });
        const headers = rawData[0];

        const results = [];
        const errors = [];

        const insertNext = (index) => {
            if (index >= rows.length) {
                fs.unlinkSync(filePath);
                return res.status(207).json({ results, errors });
            }

            const row = rows[index];

            // 👇 Bu yerda indekslar orqali har bir qiymat olinadi
            const auditorium = {
                name: row[1],
                buildingName: row[2],
                capacity: row[4] || 0,
                department: row[3] || "",
                hasProjector: row[5] || 0,
                hasElectronicScreen: row[6] || 0,
                description: row[7] || null
            };
            getBuildingIdByName(auditorium.buildingName, (err, buildingID) => {
                if (err) {
                    errors.push({ index, message: err.message });
                    return insertNext(index + 1);
                }

                // ID ni joyiga qo‘yamiz
                auditorium.buildingID = buildingID;

                createAuditorium(auditorium, req.userInfo, (err, result) => {
                    if (err) {
                        errors.push({ index, message: err.message });
                    } else {
                        results.push(result);
                    }

                    insertNext(index + 1);
                });
            });
        };


        insertNext(0);
    } catch (error) {
        console.error("Excel faylni o‘qishda xatolik:", error.message);
        res.status(500).json({ error: "Excel faylni qayta ishlashda xatolik yuz berdi" });
    }
};


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

function deleteAuditoriumsByBuildingIdController(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Bino ID majburiy" });
        }

        deleteAuditoriumsByBuildingId(id, (err) => {
            if (err) {
                if (err instanceof CustomError) {
                    return res.status(err.code).json({ error: err.message });
                }
                return res.status(500).json({ error: "Server xatosi" });
            }

            res.status(200).json({ message: id + " binosiga tegishli barcha auditoriyalar muvaffaqiyatli o'chirildi" });
        });
    } catch (error) {
        const status = error.code || 400;
        res.status(status).json({ error: error.message });
    }
}


function getOneAuditoriumByIdController(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Auditoriya ID majburiy" });
        }

        getAuditoriumById(id, (err, auditorium) => {
            if (err) {
                if (err instanceof CustomError) {
                    return res.status(err.code).json({ error: err.message });
                }
                return res.status(500).json({ error: "Server xatosi" });
            }

            res.status(200).json({ ...auditorium });
        });
    } catch (error) {
        const status = error.code || 400;
        res.status(status).json({ error: error.message });
    }
}

function deleteAuditoriumsByController(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Auditoriya ID majburiy" });
        }

        deleteAuditoriumById(id, (err) => {
            if (err) {
                if (err instanceof CustomError) {
                    return res.status(err.code).json({ error: err.message });
                }
                return res.status(500).json({ error: "Server xatosi" });
            }

            res.status(200).json({ message: "Audotiriya muvaffaqiyatli o'chirildi" });
        });
    } catch (error) {
        const status = error.code || 400;
        res.status(status).json({ error: error.message });
    }
}

const updateAuditoriumByIdController = (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
        return res.status(400).json({ error: "ID yuborilmadi" });
    }

    updateAuditoriumById(id, updates, (err, updated) => {
        if (err) {
            if (err instanceof CustomError) {
                return res.status(err.code).json({ error: err.message });
            }
            return res.status(500).json({ error: "Serverda xatolik yuz berdi" });
        }

        res.status(200).json(updated);
    });
};


module.exports = {
    createAuditoriumController,
    getAuditoriumsByBuildingIdController,
    deleteAuditoriumsByBuildingIdController,
    createAuditoriumsFromExcelController,
    getOneAuditoriumByIdController,
    deleteAuditoriumsByController,
    updateAuditoriumByIdController
};
