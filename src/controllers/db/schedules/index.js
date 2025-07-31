const { CustomError } = require("../../../components/customError");
const {
  createOrGetTeacher,
  createOrGetGroup,
  createOrGetSubject,
  addSchedule,
  getWeeklySchedule,
  getScheduleForWeeklyView,
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
      description,
    } = req.body;

    if (
      !group ||
      !subject ||
      !subjectType ||
      !teacher ||
      !auditoriumID ||
      !dayID ||
      !timeSlotID ||
      !shift ||
      !weekType ||
      !startDate ||
      !endDate
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
            description,
          };

          addSchedule(scheduleData, (err, result) => {
            if (err) {
              const status = err.code || 500;
              return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
              message: "✅ Dars jadvali muvaffaqiyatli qo‘shildi",
              data: result,
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
      throw new CustomError(
        400,
        "⚠️ buildingID, shift, weekType, startDate va endDate majburiy"
      );
    }

    const params = {
      buildingID,
      shift: Number(shift),
      weekType,
      startDate,
      endDate,
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

const getWeeklyScheduleByAuditoriumsController = (req, res) => {
  try {
    const { buildingID, shift, startWeek } = req.query;
    const userID = req?.userInfo?.id || undefined; // JWT token orqali foydalanuvchi ID

    console.log("USER ID", req?.userInfo);

    if (!buildingID || !shift) {
      throw new CustomError(400, "buildingID va shift majburiy");
    }

    const today = startWeek ? new Date(startWeek) : new Date();
    if (isNaN(today)) {
      throw new CustomError(400, "startWeek noto‘g‘ri formatda");
    }

    // Haftaning bosh va oxirini aniqlash
    const day = today.getDay(); // 0 = yakshanba, 1 = dushanba ...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStartDate = monday.toISOString().slice(0, 10);
    const weekEndDate = sunday.toISOString().slice(0, 10);

    const weekNumber = Math.ceil(
      (monday - new Date(monday.getFullYear(), 0, 1)) /
        (7 * 24 * 60 * 60 * 1000)
    );

    getScheduleForWeeklyView(
      {
        buildingID,
        shift: Number(shift),
        startDate: weekStartDate,
        endDate: weekEndDate,
        userID,
      },
      (err, lessons) => {
        if (err) {
          return res.status(err.code || 500).json({ error: err.message });
        }

        res.status(200).json({
          ...lessons,
        });
      }
    );
  } catch (error) {
    const status = typeof error.code === "number" ? error.code : 500;
    res.status(status).json({ error: error.message });
  }
};

module.exports = {
  addScheduleController,
  getWeeklyScheduleController,
  getWeeklyScheduleByAuditoriumsController,
};
