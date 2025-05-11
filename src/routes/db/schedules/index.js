const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    authorizeAdmin,
    authenticateTokenJustCheckAndSkip,
} = require("../../../middleware/auth");
const { addScheduleController, getWeeklyScheduleController, getWeeklyScheduleByAuditoriumsController } = require("../../../controllers/db/schedules");



router.post("/", authenticateToken, authorizeAdmin, addScheduleController);
router.get("/", getWeeklyScheduleController);
router.get("/weekly", authenticateTokenJustCheckAndSkip, getWeeklyScheduleByAuditoriumsController);



module.exports = router;


const a = {
    buildingID: "uuuid",
    weekNumber: 1, // bu yildagi 1-hafta
    weekStartDate: "2025-05-05",
    weekEndDate: "2025-11-05",
    shift: 1,
    lessons: {
        "A-101": {
            "Dushanba": [
                {
                    "schduleId": "id in schdules table",
                    "timeSlot": 1,
                    "subject": "Matematika",
                    "teacher": "Azizbek Karimov",
                    "isThisTeacher": false, // userinfo?.id teacherni id siga teng bo`lsa true bo`ladi. Yani bu sorayotgan odam shu fandagi oqituvchimi?
                }
            ],
            "Seshanba": [
                {
                    "schduleId": "id in schdules table",
                    "timeSlot": 1,
                    "subject": "Matematika",
                    "teacher": "Azizbek Karimov",
                    "isThisTeacher": false, // userinfo?.id teacherni id siga teng bo`lsa true bo`ladi. Yani bu sorayotgan odam shu fandagi oqituvchimi?
                }
            ],
            "Chorshanba": [
                {
                    "schduleId": "id in schdules table",
                    "timeSlot": 1,
                    "subject": "Matematika",
                    "teacher": "Azizbek Karimov",
                    "isThisTeacher": false, // userinfo?.id teacherni id siga teng bo`lsa true bo`ladi. Yani bu sorayotgan odam shu fandagi oqituvchimi?
                }
            ]
            // ....
        },
        "AuditoriyaNomi": {
            // ...
        },
        // Hudd ishu korinishida soralgan binodagi auditoriyadagi dars borligini qaytarish kerak.
    }
    ,
}