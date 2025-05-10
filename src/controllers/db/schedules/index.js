const { CustomError } = require("../../../components/customError");
const {
    createOrGetTeacher,
    createOrGetGroup,
    createOrGetSubject,
    addSchedule,
    getWeeklySchedule
} = require("../../../db/db");

const addScheduleController = (req, res) => {
    try {
        const {
            group,
            subject,
            subjectType,
            teacher,
            auditoriumID, // ✅ endi ID keladi
            dayID,
            timeSlotID,
            shift,
            weekType,
            startDate,
            endDate,
            description
        } = req.body;

        if (
            !group || !subject || !subjectType || !teacher ||
            !auditoriumID || !dayID || !timeSlotID || !shift ||
            !weekType || !startDate || !endDate
        ) {
            throw new CustomError(400, "⚠️ Barcha maydonlar to‘ldirilishi shart");
        }

        createOrGetGroup(group, (err, groupID) => {
            if (err) return res.status(500).json({ error: err.message });

            createOrGetSubject(subject, subjectType, (err, subjectID) => {
                if (err) return res.status(500).json({ error: err.message });

                createOrGetTeacher(teacher, (err, teacherID) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // ✅ Endi all IDs ready — no need to check auditorium
                    const scheduleData = {
                        groupID,
                        subjectID,
                        teacherID,
                        auditoriumID,
                        dayID,
                        timeSlotID,
                        shift,
                        weekType,
                        startDate,
                        endDate,
                        description
                    };

                    addSchedule(scheduleData, (err, result) => {
                        if (err) {
                            const status = err.code || 500;
                            return res.status(status).json({ error: err.message });
                        }

                        res.status(201).json({
                            message: "✅ Dars jadvali muvaffaqiyatli qo‘shildi",
                            data: result
                        });
                    });
                });
            });
        });
    } catch (error) {
        const status = error.code || 500;
        res.status(status).json({ error: error.message });
    }
};

const getWeeklyScheduleController = (req, res) => {
    try {
        const { buildingID, shift, weekType, startDate, endDate } = req.query;

        if (!buildingID || !shift || !weekType || !startDate || !endDate) {
            throw new CustomError(400, "⚠️ buildingID, shift, weekType, startDate va endDate majburiy");
        }

        const params = {
            buildingID,
            shift: Number(shift),
            weekType,
            startDate,
            endDate
        };

        getWeeklySchedule(params, (err, result) => {
            if (err) {
                const status = typeof err.code === "number" ? err.code : 500;
                return res.status(status).json({ error: err.message });
            }

            res.status(200).json(result);
        });
    } catch (error) {
        const status = typeof error.code === "number" ? error.code : 500;
        res.status(status).json({ error: error.message });
    }
};




module.exports = {
    addScheduleController,
    getWeeklyScheduleController
};
