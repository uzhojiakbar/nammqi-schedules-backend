require("dotenv").config();
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const { CustomError } = require("../components/customError");
const { userFindByUsername, insertUser } = require("./queries");
const { transliterate } = require("transliteration");
const bcrypt = require("bcryptjs");

const DB_PATH = process.env.DATABASE_URL;

if (!DB_PATH) {
  console.error("❌ .env faylida DATABASE_URL aniqlanmagan!");
  process.exit(1);
}

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB ulanishda xatolik:", err.message);
  } else {
    console.log("✅ SQLite DB ulanmoqda...");

    createUsersTable();
    createTokenTable();
    createAccessTokenTable();
    createBuildingsTable();
    createAuditoriumsTable();

    //

    createTeachersTable();
    createGroupsTable();
    createSubjectsTable();
    createSchedulesTable();
    createDaysTable();
    createTimeSlotsTable();

    // Static jadval to‘ldirish
    seedDays();
    seedTimeSlots();
  }
});

function seedDays() {
  const days = [
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" },
  ];

  days.forEach(({ id, name }) => {
    db.run("INSERT OR IGNORE INTO days (id, name) VALUES (?, ?)", [id, name]);
  });
}

function seedTimeSlots() {
  const slots = [
    { shift: 1, lessonNumber: 1, start: "08:30", end: "09:50" },
    { shift: 1, lessonNumber: 2, start: "10:00", end: "11:20" },
    { shift: 1, lessonNumber: 3, start: "11:30", end: "12:50" },
    { shift: 1, lessonNumber: 4, start: "13:30", end: "14:50" },
    { shift: 1, lessonNumber: 5, start: "15:00", end: "16:20" },
    { shift: 1, lessonNumber: 6, start: "16:30", end: "17:50" },
    { shift: 2, lessonNumber: 1, start: "17:00", end: "18:30" },
    { shift: 2, lessonNumber: 2, start: "18:40", end: "20:10" },
    { shift: 2, lessonNumber: 3, start: "20:20", end: "21:50" },
  ];

  slots.forEach(({ shift, lessonNumber, start, end }) => {
    db.run(
      "INSERT OR IGNORE INTO time_slots (shift, lessonNumber, startTime, endTime) VALUES (?, ?, ?, ?)",
      [shift, lessonNumber, start, end]
    );
  });
}

function createUsersTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstname TEXT,
      lastname TEXT,
      role TEXT CHECK(role IN ('admin', 'user', 'teacher')) NOT NULL DEFAULT 'user'
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ users jadvali tayyor");
    }
  });
}

function createTokenTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    user_agent TEXT,
    ip TEXT,
    expires_at TEXT
  );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error(
        "❌ refresh_tokens Jadval yaratishda xatolik:",
        err.message
      );
    } else {
      console.log("✅ refresh_tokens jadvali tayyor");
    }
  });
}

function createAccessTokenTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS access_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT
  );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ access_tokens Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ access_tokens jadvali tayyor");
    }
  });
}

function createUser(user, callback) {
  const id = uuidv4();
  const {
    username,
    password,
    firstname = "",
    lastname = "",
    role = "user",
  } = user;

  db.get(userFindByUsername, [username], (err, row) => {
    if (err) return callback(err);

    // ------------- USER OLDIN QATNASHGANMI? -------------
    if (row) {
      return callback(
        new CustomError(
          409,
          "Bunday usernamedagi foydalanuvchi allaqachon mavjud"
        )
      );
    }

    // ------------- HAMMASI ok bo`lsa, user created qilamiz. -------------

    db.run(
      insertUser,
      [id, username, password, firstname, lastname, role],
      function (err) {
        if (err) return callback(err);
        callback(null, { id });
      }
    );
  });
}

// BUILDINGS
function createBuildingsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS buildings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL CHECK(name != ''),
      address TEXT NOT NULL CHECK(address != ''),
      creatorID TEXT NOT NULL CHECK(creatorID != '')
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ buildings jadvalini yaratishda xatolik:", err.message);
    } else {
      console.log("✅ buildings jadvali tayyor");
    }
  });
}

function createBuilding(building, user, callback) {
  const id = uuidv4();
  const { name, address } = building;

  if (!name) {
    return callback(new CustomError(400, "Binoning nomi majburiy"));
  }
  if (!address) {
    return callback(new CustomError(400, "Binoning manzili majburiy"));
  }

  const insertBuildingSQL = `
    INSERT INTO buildings (id, name, address, creatorID)
    VALUES (?, ?, ?, ?);
  `;

  db.run(
    insertBuildingSQL,
    [id, name, address, user?.id || null],
    function (err) {
      if (err) {
        return callback(err);
      }
      callback(null, { id });
    }
  );
}

function getUserData(userId, callback) {
  const query = `SELECT id, username, firstname, lastname, role FROM users WHERE id = ?`;
  db.get(query, [userId], (err, row) => {
    if (err) {
      return callback(new CustomError(500, "SQLITE3 ga ulanishda xatolik"));
    }
    if (!row) {
      return callback(new CustomError(404, "Foydalanuvchi topilmadi"));
    }
    callback(null, row);
  });
}

function getAllBuildings(filters, page, size, callback) {
  let baseSQL = `
    SELECT b.*, 
           u.firstname AS creatorFirstname, 
           u.lastname AS creatorLastname, 
           u.role AS creatorRole, 
           u.username AS creatorUsername, 
           u.id AS creatorId
    FROM buildings b
    LEFT JOIN users u ON b.creatorID = u.id
  `;

  let countSQL = `
    SELECT COUNT(*) AS totalCount
    FROM buildings b
    LEFT JOIN users u ON b.creatorID = u.id
  `;

  const conditions = [];
  const params = [];

  if (filters.name) {
    conditions.push("b.name LIKE ?");
    params.push(`%${filters.name}%`);
  }
  if (filters.address) {
    conditions.push("b.address LIKE ?");
    params.push(`%${filters.address}%`);
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(" AND ")}`;
    baseSQL += whereClause;
    countSQL += whereClause;
  }

  const offset = (page - 1) * size;
  baseSQL += ` LIMIT ? OFFSET ?`;
  params.push(size, offset);

  db.all(countSQL, params.slice(0, -2), (err, countRows) => {
    if (err) return callback(err);

    const totalCount = countRows[0].totalCount;

    db.all(baseSQL, params, (err, rows) => {
      if (err) return callback(err);

      const result = rows.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        creatorDTO: {
          id: row.creatorId || null,
          firstname: row.creatorFirstname || null,
          lastname: row.creatorLastname || null,
          role: row.creatorRole || null,
          username: row.creatorUsername || null,
        },
      }));

      callback(null, result, totalCount);
    });
  });
}

function getBuildingById(buildingId, callback) {
  const selectBuildingSQL = `
    SELECT b.*, 
           u.firstname AS creatorFirstname, 
           u.lastname AS creatorLastname, 
           u.role AS creatorRole, 
           u.username AS creatorUsername, 
           u.id AS creatorId
    FROM buildings b
    LEFT JOIN users u ON b.creatorID = u.id
    WHERE b.id = ?
  `;

  db.get(selectBuildingSQL, [buildingId], (err, row) => {
    if (err) {
      return callback(err);
    }
    if (!row) {
      return callback(new CustomError(404, "Bunday ID bilan bino topilmadi"));
    }

    const result = {
      id: row.id,
      name: row.name,
      address: row.address,
      creatorDTO: {
        id: row.creatorId || null,
        firstname: row.creatorFirstname || null,
        lastname: row.creatorLastname || null,
        role: row.creatorRole || null,
        username: row.creatorUsername || null,
      },
    };

    callback(null, result);
  });
}

const getBuildingIdByName = (buildingName, callback) => {
  db.get(
    "SELECT id FROM buildings WHERE name = ?",
    [buildingName],
    (err, row) => {
      if (err) return callback(new CustomError(500, "Bazada xatolik"));
      if (!row)
        return callback(
          new CustomError(400, `Bino topilmadi: ${buildingName}`)
        );
      callback(null, row.id);
    }
  );
};

function deleteBuildingById(buildingId, callback) {
  const deleteBuildingSQL = `
    DELETE FROM buildings WHERE id = ?;
  `;

  db.run(deleteBuildingSQL, [buildingId], function (err) {
    if (err) {
      return callback(err);
    }
    if (this.changes === 0) {
      return callback(new CustomError(404, "Bunday ID bilan bino topilmadi"));
    }
    callback(null);
  });
}

function updateBuildingById(buildingId, updates, callback) {
  const { name, address } = updates;

  if (!name && !address) {
    return callback(
      new CustomError(400, "Hech bo'lmaganda name yoki address kerak")
    );
  }

  const fields = [];
  const params = [];

  if (name) {
    fields.push("name = ?");
    params.push(name);
  }

  if (address) {
    fields.push("address = ?");
    params.push(address);
  }

  params.push(buildingId);

  const updateBuildingSQL = `
    UPDATE buildings
    SET ${fields.join(", ")}
    WHERE id = ?;
  `;

  db.run(updateBuildingSQL, params, function (err) {
    if (err) {
      return callback(err);
    }
    if (this.changes === 0) {
      return callback(new CustomError(404, "Bunday ID bilan bino topilmadi"));
    }
    callback(null);
  });
}

// AUDITORIUMS CONTROLLER

// AUDITORIYALAR jadvalini yaratish
function createAuditoriumsTable() {
  db.run("PRAGMA foreign_keys = ON");

  const createTableSQL = `
   CREATE TABLE IF NOT EXISTS auditoriums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(name != ''),
    buildingID TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity > 0),
    department TEXT,
    hasProjector INTEGER NOT NULL DEFAULT 0 CHECK(hasProjector IN (0,1)),
    hasElectronicScreen INTEGER NOT NULL DEFAULT 0 CHECK(hasElectronicScreen IN (0,1)),
    description TEXT,
    creatorID TEXT DEFAULT NULL,
    FOREIGN KEY(buildingID) REFERENCES buildings(id) ON DELETE CASCADE,
    FOREIGN KEY(creatorID) REFERENCES users(id) ON DELETE SET NULL
  );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error(
        "❌ Auditoriyalar jadvalini yaratishda xatolik:",
        err.message
      );
    } else {
      console.log("✅ Auditoriyalar jadvali tayyor");
    }
  });
}

function createAuditorium(auditorium, user, callback) {
  const id = uuidv4();

  const {
    name,
    buildingID,
    capacity,
    department,
    hasProjector,
    hasElectronicScreen,
    description = null,
  } = auditorium;

  function validateAuditorium(auditorium, callbackInner) {
    db.get(
      "SELECT id FROM buildings WHERE id = ?",
      [buildingID],
      (err, buildingRow) => {
        if (err)
          return callbackInner(
            new CustomError(500, "Bazada xatolik yuz berdi")
          );
        if (!buildingRow) {
          return callbackInner(
            new CustomError(400, `Bunday IDdagi bino topilmadi: ${buildingID}`)
          );
        }
      }
    );

    const requiredFields = [
      { key: "name", label: "Xona nomi" },
      { key: "buildingID", label: "Bino IDsi" },
      { key: "capacity", label: "Sig'imi" },
      { key: "department", label: "Kafedra" },
      { key: "hasProjector", label: "Proektor mavjudligi" },
      { key: "hasElectronicScreen", label: "Elektron ekran mavjudligi" },
    ];

    for (const field of requiredFields) {
      const value = auditorium[field.key];

      if (value === undefined || value === null || value === "") {
        return callbackInner(new CustomError(400, `${field.label} majburiy`));
      }

      if (field.key === "capacity") {
        const parsed = parseInt(value);
        if (isNaN(parsed) || parsed <= 0) {
          return callbackInner(
            new CustomError(400, `Sig'im faqat musbat son bo'lishi kerak`)
          );
        }
      }

      if (
        (field.key === "hasProjector" || field.key === "hasElectronicScreen") &&
        ![0, 1].includes(Number(value))
      ) {
        return callbackInner(
          new CustomError(400, `${field.label} faqat 0 yoki 1 bo'lishi kerak`)
        );
      }
    }

    callbackInner(null);
  }

  validateAuditorium(auditorium, (err) => {
    if (err) return callback(err);

    const insertSQL = `
      INSERT INTO auditoriums (
        id, name, buildingID, capacity, department,
        hasProjector, hasElectronicScreen, description, creatorID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    db.run(
      insertSQL,
      [
        id,
        name,
        buildingID,
        parseInt(capacity),
        department,
        Number(hasProjector),
        Number(hasElectronicScreen),
        description,
        user?.id || null,
      ],
      function (err) {
        if (err) {
          console.error("❌ Auditoriya qo'shishda xatolik:", err.message);
          return callback(new CustomError(500, "Auditoriya saqlashda xatolik"));
        }

        callback(null, { id });
      }
    );
  });
}

function getAuditoriumsByBuildingId(
  buildingId,
  filters,
  page = 1,
  size = 10,
  callback
) {
  let selectSQL = `
    SELECT a.*,
      u.firstname AS creatorFirstname, 
      u.lastname AS creatorLastname, 
      u.role AS creatorRole, 
      u.username AS creatorUsername, 
      u.id AS creatorId,

      b.id AS buildingId,
      b.name AS buildingName,
      b.address AS buildingAddress,

      u2.id AS buildingCreatorId,
      u2.firstname AS buildingCreatorFirstname,
      u2.lastname AS buildingCreatorLastname,
      u2.role AS buildingCreatorRole,
      u2.username AS buildingCreatorUsername
    FROM auditoriums a
    LEFT JOIN users u ON a.creatorID = u.id
    LEFT JOIN buildings b ON a.buildingID = b.id
    LEFT JOIN users u2 ON b.creatorID = u2.id
    WHERE a.buildingID = ?
  `;

  let countSQL = `
    SELECT COUNT(*) as totalCount
    FROM auditoriums a
    WHERE a.buildingID = ?
  `;

  const selectValues = [buildingId];
  const countValues = [buildingId];

  // FILTERLAR
  if (filters.creatorId) {
    selectSQL += " AND a.creatorID = ?";
    countSQL += " AND a.creatorID = ?";
    selectValues.push(filters.creatorId);
    countValues.push(filters.creatorId);
  }

  if (filters.department) {
    selectSQL += " AND a.department LIKE ?";
    countSQL += " AND a.department LIKE ?";
    selectValues.push(`%${filters.department}%`);
    countValues.push(`%${filters.department}%`);
  }

  if (filters.capacity) {
    selectSQL += " AND a.capacity >= ?";
    countSQL += " AND a.capacity >= ?";
    selectValues.push(filters.capacity);
    countValues.push(filters.capacity);
  }

  if (filters.name) {
    selectSQL += " AND a.name LIKE ?";
    countSQL += " AND a.name LIKE ?";
    selectValues.push(`%${filters.name}%`);
    countValues.push(`%${filters.name}%`);
  }

  const offset = (page - 1) * size;
  selectSQL += " LIMIT ? OFFSET ?";
  selectValues.push(size, offset);

  db.get(countSQL, countValues, (countErr, countRow) => {
    if (countErr) return callback(countErr);

    const totalCount = countRow?.totalCount || 0;

    db.all(selectSQL, selectValues, (err, rows) => {
      if (err) return callback(err);

      if (!rows || rows.length === 0) {
        return callback(
          new CustomError(404, "Bu binoda auditoriyalar topilmadi")
        );
      }

      const first = rows[0];
      const buildingDTO = {
        id: first.buildingId || null,
        name: first.buildingName || null,
        address: first.buildingAddress || null,
        creatorDTO: {
          id: first.buildingCreatorId || null,
          firstname: first.buildingCreatorFirstname || null,
          lastname: first.buildingCreatorLastname || null,
          role: first.buildingCreatorRole || null,
          username: first.buildingCreatorUsername || null,
        },
      };

      const auditoriums = rows.map((row) => ({
        id: row.id,
        name: row.name,
        capacity: row.capacity,
        department: row.department,
        hasProjector: row.hasProjector,
        hasElectronicScreen: row.hasElectronicScreen,
        description: row.description,
        creatorDTO: {
          id: row.creatorId || null,
          firstname: row.creatorFirstname || null,
          lastname: row.creatorLastname || null,
          role: row.creatorRole || null,
          username: row.creatorUsername || null,
        },
        buildingDTO,
      }));

      const totalPages = Math.ceil(totalCount / size);
      const paginationInfo = {
        totalCount,
        totalPages,
        currentPage: page,
        pageSize: size,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      callback(null, auditoriums, paginationInfo);
    });
  });
}

function getAuditoriumById(auditoriumID, callback) {
  const selectBuildingSQL = `
     SELECT a.*,
      u.firstname AS creatorFirstname, 
      u.lastname AS creatorLastname, 
      u.role AS creatorRole, 
      u.username AS creatorUsername, 
      u.id AS creatorId,

      b.id AS buildingId,
      b.name AS buildingName,
      b.address AS buildingAddress,

      u2.id AS buildingCreatorId,
      u2.firstname AS buildingCreatorFirstname,
      u2.lastname AS buildingCreatorLastname,
      u2.role AS buildingCreatorRole,
      u2.username AS buildingCreatorUsername
    FROM auditoriums a
    LEFT JOIN users u ON a.creatorID = u.id
    LEFT JOIN buildings b ON a.buildingID = b.id
    LEFT JOIN users u2 ON b.creatorID = u2.id
    WHERE a.id = ?
  `;

  db.get(selectBuildingSQL, [auditoriumID], (err, row) => {
    if (err) {
      return callback(err);
    }
    if (!row) {
      return callback(
        new CustomError(404, "Bunday ID bilan auditoriya topilmadi")
      );
    }

    const buildingDTO = {
      id: row.buildingId || null,
      name: row.buildingName || null,
      address: row.buildingAddress || null,
      creatorDTO: {
        id: row.buildingCreatorId || null,
        firstname: row.buildingCreatorFirstname || null,
        lastname: row.buildingCreatorLastname || null,
        role: row.buildingCreatorRole || null,
        username: row.buildingCreatorUsername || null,
      },
    };

    const result = {
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      department: row.department,
      hasProjector: row.hasProjector,
      hasElectronicScreen: row.hasElectronicScreen,
      description: row.description,
      creatorDTO: {
        id: row.creatorId || null,
        firstname: row.creatorFirstname || null,
        lastname: row.creatorLastname || null,
        role: row.creatorRole || null,
        username: row.creatorUsername || null,
      },
      buildingDTO,
    };

    callback(null, result);
  });
}

function deleteAuditoriumsByBuildingId(buildingId, callback) {
  const deleteAuditoriumsSQL = `
    DELETE FROM auditoriums WHERE buildingID = ?;
  `;

  db.run(deleteAuditoriumsSQL, [buildingId], function (err) {
    if (err) {
      return callback(err);
    }

    if (this.changes === 0) {
      return callback(
        new CustomError(404, "Bu bino ga tegishli auditoriyalar topilmadi")
      );
    }

    callback(null);
  });
}

function deleteAuditoriumById(auditoriumID, callback) {
  const deleteBuildingSQL = `
    DELETE FROM auditoriums WHERE id = ?;
  `;

  db.run(deleteBuildingSQL, [auditoriumID], function (err) {
    if (err) {
      return callback(err);
    }
    if (this.changes === 0) {
      return callback(
        new CustomError(404, "Bunday ID bilan Audotiriya topilmadi")
      );
    }
    callback(null);
  });
}

const updateAuditoriumById = (id, updates, callback) => {
  const allowedFields = [
    "name",
    "buildingID",
    "capacity",
    "department",
    "hasProjector",
    "hasElectronicScreen",
    "description",
  ];

  const fieldsToUpdate = [];
  const values = [];

  for (const key of allowedFields) {
    if (key in updates) {
      fieldsToUpdate.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fieldsToUpdate.length === 0) {
    return callback(new CustomError(400, "Yangi ma'lumotlar topilmadi"));
  }

  const updateSQL = `
    UPDATE auditoriums
    SET ${fieldsToUpdate.join(", ")}
    WHERE id = ?
  `;

  values.push(id);

  db.run(updateSQL, values, function (err) {
    if (err) {
      console.error("Auditoriya yangilashda xatolik:", err.message);
      return callback(new CustomError(500, "Auditoriya yangilashda xatolik"));
    }

    if (this.changes === 0) {
      return callback(
        new CustomError(404, "Bunday ID bilan auditoriya topilmadi")
      );
    }

    // Updated auditoriya qaytariladi
    db.get("SELECT * FROM auditoriums WHERE id = ?", [id], (err, row) => {
      if (err || !row) {
        return callback(
          new CustomError(500, "Yangilangan auditoriya topilmadi")
        );
      }
      callback(null, row);
    });
  });
};

// SCHEDULES

function createTeachersTable() {
  const createTableSQL = `
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL UNIQUE
  );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Teachers Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ Teachers jadvali tayyor");
    }
  });
}

function createGroupsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Groups Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ Groups jadvali tayyor");
    }
  });
}

function createSubjectsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      UNIQUE(name, type)
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Subjects Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ Subjects jadvali tayyor");
    }
  });
}

function createTimeSlotsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift INTEGER NOT NULL CHECK(shift IN (1, 2)), 
      lessonNumber INTEGER NOT NULL,                 
      startTime TEXT NOT NULL,                      
      endTime TEXT NOT NULL,
      UNIQUE(shift, lessonNumber)
    );
  `;

  //  -- 1 = kunduzgi, 2 = kechki
  // -- 1 to 6
  //  -- "08:30"

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ time_slots Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ time_slots jadvali tayyor");
    }
  });
}

function createDaysTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS  days (
      id INTEGER PRIMARY KEY, -- 1 = Monday ... 6 = Saturday
      name TEXT NOT NULL UNIQUE
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Days Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ Days jadvali tayyor");
    }
  });
}

function createSchedulesTable() {
  db.run("PRAGMA foreign_keys = ON");

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS  schedules (
    id TEXT PRIMARY KEY,

    groupID TEXT NOT NULL,
    subjectID TEXT NOT NULL,
    teacherID TEXT NOT NULL,
    auditoriumID TEXT NOT NULL,
    dayID INTEGER NOT NULL,
    timeSlotID INTEGER NOT NULL,

    weekType TEXT NOT NULL CHECK(weekType IN ('odd', 'even')),
    shift INTEGER NOT NULL CHECK(shift IN (1, 2)),
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(groupID) REFERENCES groups(id),
    FOREIGN KEY(subjectID) REFERENCES subjects(id),
    FOREIGN KEY(teacherID) REFERENCES teachers(id),
    FOREIGN KEY(auditoriumID) REFERENCES auditoriums(id),
    FOREIGN KEY(dayID) REFERENCES days(id),
    FOREIGN KEY(timeSlotID) REFERENCES time_slots(id)
  );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Schedules Jadval yaratishda xatolik:", err.message);
    } else {
      console.log("✅ Schedules jadvali tayyor");
    }
  });
}

// eh, boshladik, Bismillah...
// TEACHER
function getAllTeachers(callback) {
  db.all(
    "SELECT id, fullName FROM teachers ORDER BY fullName ASC",
    [],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    }
  );
}

//
function generateUniqueUsername(baseUsername, attempt = 0, callback) {
  const candidate = attempt === 0 ? baseUsername : `${baseUsername}${attempt}`;
  db.get("SELECT id FROM users WHERE username = ?", [candidate], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(null, candidate);
    generateUniqueUsername(baseUsername, attempt + 1, callback);
  });
}

function parseNameParts(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstname: parts[0] || "",
    lastname: parts[1] || "",
  };
}

function createOrGetTeacher(fullName, callback) {
  db.get(
    "SELECT id FROM teachers WHERE fullName = ?",
    [fullName],
    (err, row) => {
      if (err) return callback(err);
      if (row) return callback(null, row.id);

      const id = uuidv4();
      const { firstname, lastname } = parseNameParts(fullName);
      const baseUsername = transliterate(
        fullName.replace(/['"`.,]/g, "").toLowerCase()
      );

      generateUniqueUsername(baseUsername, 0, (err, uniqueUsername) => {
        if (err) return callback(err);

        const rawPassword = uniqueUsername;

        bcrypt.hash(rawPassword, 10, (err, hashedPassword) => {
          if (err) return callback(err);

          // ⬇️ Dastlab o‘qituvchini qo‘shamiz
          db.run(
            "INSERT INTO teachers (id, fullName) VALUES (?, ?)",
            [id, fullName],
            (err) => {
              if (err) return callback(err);

              // ⬇️ Endi user qo‘shamiz
              db.run(
                `INSERT INTO users (id, username, password, firstname, lastname, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  id,
                  uniqueUsername,
                  hashedPassword,
                  firstname,
                  lastname,
                  "user",
                ],
                (err) => {
                  if (err) return callback(err);
                  callback(null, id);
                }
              );
            }
          );
        });
      });
    }
  );
}

// GROUP
function createOrGetGroup(name, callback) {
  db.get("SELECT id FROM groups WHERE name = ?", [name], (err, row) => {
    if (err) return callback(err);
    if (row) return callback(null, row.id);

    const id = uuidv4();
    db.run("INSERT INTO groups (id, name) VALUES (?, ?)", [id, name], (err) => {
      if (err) return callback(err);
      callback(null, id);
    });
  });
}

function getAllGroups(callback) {
  db.all("SELECT id, name FROM groups ORDER BY name ASC", [], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

// SUBJECT
function createOrGetSubject(name, type, callback) {
  db.get(
    "SELECT id FROM subjects WHERE name = ? AND type = ?",
    [name, type],
    (err, row) => {
      if (err) return callback(err);
      if (row) return callback(null, row.id);

      const id = uuidv4();
      db.run(
        "INSERT INTO subjects (id, name, type) VALUES (?, ?, ?)",
        [id, name, type],
        (err) => {
          if (err) return callback(err);
          callback(null, id);
        }
      );
    }
  );
}

function getAllSubjects(callback) {
  db.all(
    "SELECT id, name, type FROM subjects ORDER BY name ASC",
    [],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    }
  );
}

function checkConflict(data, callback) {
  const {
    dayID,
    timeSlotID,
    shift,
    weekType,
    startDate,
    endDate,
    auditoriumID,
    teacherID,
    groupID,
  } = data;

  const query = `
    SELECT id, 'auditorium' AS conflictType FROM schedules
    WHERE
      dayID = ?
      AND timeSlotID = ?
      AND shift = ?
      AND weekType = ?
      AND auditoriumID = ?
      AND (
        startDate <= ? AND endDate >= ?
      )
    UNION
    SELECT id, 'teacher' AS conflictType FROM schedules
    WHERE
      dayID = ?
      AND timeSlotID = ?
      AND shift = ?
      AND weekType = ?
      AND teacherID = ?
      AND (
        startDate <= ? AND endDate >= ?
      )
    UNION
    SELECT id, 'group' AS conflictType FROM schedules
    WHERE
      dayID = ?
      AND timeSlotID = ?
      AND shift = ?
      AND weekType = ?
      AND groupID = ?
      AND (
        startDate <= ? AND endDate >= ?
      )
    LIMIT 1
  `;

  const values = [
    // auditorium conflict
    dayID,
    timeSlotID,
    shift,
    weekType,
    auditoriumID,
    endDate,
    startDate,
    // teacher conflict
    dayID,
    timeSlotID,
    shift,
    weekType,
    teacherID,
    endDate,
    startDate,
    // group conflict
    dayID,
    timeSlotID,
    shift,
    weekType,
    groupID,
    endDate,
    startDate,
  ];

  db.get(query, values, (err, row) => {
    if (err) return callback(err);
    if (row) {
      const messages = {
        auditorium: "❌ Bu vaqtda bu auditoriyada dars bor",
        teacher: "❌ Bu o‘qituvchining bu vaqtda boshqa darsi bor",
        group: "❌ Bu guruhda bu vaqtda boshqa dars bor",
      };
      return callback(
        new CustomError(
          400,
          messages[row.conflictType] || "❌ Jadval ziddiyati mavjud"
        )
      );
    }
    callback(null);
  });
}

function validateForeignKeys(scheduleData, callback) {
  const foreignKeyChecks = [
    { table: "groups", column: "id", value: scheduleData.groupID },
    { table: "subjects", column: "id", value: scheduleData.subjectID },
    { table: "teachers", column: "id", value: scheduleData.teacherID },
    { table: "auditoriums", column: "id", value: scheduleData.auditoriumID },
    { table: "days", column: "id", value: scheduleData.dayID },
    { table: "time_slots", column: "id", value: scheduleData.timeSlotID },
  ];

  let missingKeys = [];

  let checked = 0;

  foreignKeyChecks.forEach(({ table, column, value }) => {
    const query = `SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`;
    db.get(query, [value], (err, row) => {
      if (err) return callback(err);

      if (!row) {
        missingKeys.push({ table, column, value });
      }

      checked++;
      if (checked === foreignKeyChecks.length) {
        if (missingKeys.length > 0) {
          const msg = missingKeys
            .map((k) => `⛔ ${k.table}.${k.column} = ${k.value} not found.`)
            .join("\n");
          return callback(new Error("Foreign key check failed:\n" + msg));
        }
        return callback(null); // All foreign keys are valid
      }
    });
  });
}

function insertSchedule(data, callback) {
  const id = uuidv4();
  const {
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
  } = data;

  if (new Date(endDate) <= new Date(startDate)) {
    return callback(
      new CustomError(
        400,
        "Tugash vaqti boshlanish vaqtidan keyin bo`lishi kerak"
      )
    );
  }

  const query = `
    INSERT INTO schedules (
      id, groupID, subjectID, teacherID, auditoriumID,
      dayID, timeSlotID, shift, weekType, startDate, endDate, description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
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
    description || null,
  ];

  console.log("Inserting schedule with values:", values);

  db.run(query, values, (err) => {
    if (err) return callback(err);
    callback(null, { id });
  });
}

function addSchedule(scheduleData, callback) {
  const weekTypes =
    scheduleData.weekType === "both"
      ? ["odd", "even"]
      : [scheduleData.weekType];
  const results = [];

  const insertNext = (index) => {
    if (index >= weekTypes.length) return callback(null, results);

    const currentType = weekTypes[index];
    const data = { ...scheduleData, weekType: currentType };

    checkConflict(data, (err) => {
      if (err) return callback(err);

      validateForeignKeys(scheduleData, (err) => {
        if (err) {
          console.error("Foreign key validation error:", err.message);
          return callback(err);
        }

        // endi davom ettirsa bo'ladi
        insertSchedule(data, (err, result) => {
          if (err) return callback(err);
          results.push(result);
          insertNext(index + 1);
        });
      });
    });
  };

  insertNext(0);
}

// GET SCHEDULE

function getWeeklySchedule(
  { buildingID, weekType, shift, startDate, endDate },
  callback
) {
  const query = `
    SELECT
      s.dayID,
      s.timeSlotID,
      s.startDate,
      s.endDate,
      s.description,
      d.name AS dayName,
      ts.lessonNumber,

      g.name AS groupName,
      t.fullName AS teacher,
      sub.name AS subject,
      sub.type AS subjectType,
      a.name AS auditorium

    FROM schedules s
    JOIN groups g ON s.groupID = g.id
    JOIN teachers t ON s.teacherID = t.id
    JOIN subjects sub ON s.subjectID = sub.id
    JOIN auditoriums a ON s.auditoriumID = a.id
    JOIN days d ON s.dayID = d.id
    JOIN time_slots ts ON s.timeSlotID = ts.id

    WHERE
      a.buildingID = ?
      AND s.shift = ?
      AND s.weekType = ?
      AND s.startDate <= ?
      AND s.endDate >= ?
    ORDER BY s.dayID, ts.lessonNumber
  `;

  const params = [buildingID, shift, weekType, endDate, startDate];

  db.all(query, params, (err, rows) => {
    if (err) return callback(err);

    const result = {
      startDate,
      endDate,
      shift,
      buildingID,
      weekType,
      days: {},
    };

    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const maxPara = shift === 1 ? 6 : 3;

    // Avval null bilan to‘ldiramiz
    for (const day of dayNames) {
      result.days[day] = {};
      for (let i = 1; i <= maxPara; i++) {
        result.days[day][i] = null;
      }
    }

    // Endi mavjudlarni qo‘shamiz
    for (const row of rows) {
      result.days[row.dayName][row.lessonNumber] = {
        subject: row.subject,
        type: row.subjectType,
        teacher: row.teacher,
        group: row.groupName,
        auditorium: row.auditorium,
        startDate: row.startDate,
        endDate: row.endDate,
        description: row.description || null,
      };
    }

    callback(null, result);
  });
}

function getWeekNumber(date) {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const janFirstDay = oneJan.getDay() || 7;
  const firstMonday = new Date(oneJan);
  firstMonday.setDate(
    oneJan.getDate() + (janFirstDay > 1 ? 8 - janFirstDay : 0)
  );

  const diffInMs = date - firstMonday;
  const diffInDays = Math.floor(diffInMs / (24 * 60 * 60 * 1000));

  return diffInDays >= 0 ? Math.floor(diffInDays / 7) + 1 : 1;
}

function getWeekType(date) {
  const weekNumber = getWeekNumber(date);
  return weekNumber % 2 === 1 ? "odd" : "even";
}

function getScheduleForWeeklyView(
  { buildingID, shift, startDate, userID },
  callback
) {
  const start = new Date(startDate);
  const weekDay = start.getDay();
  const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay;
  const monday = new Date(start);
  monday.setDate(start.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStartDate = monday.toISOString().slice(0, 10);
  const weekEndDate = sunday.toISOString().slice(0, 10);
  const weekNumber = getWeekNumber(monday);
  const weekType = getWeekType(monday);

  const query = `
    SELECT
      s.id AS scheduleId,
      s.timeSlotID,
      s.teacherID,
      s.dayID,
      d.name AS dayName,
      sub.name AS subject,
      t.fullName AS teacher,
      a.name AS auditoriumName,
      s.weekType
    FROM schedules s
    JOIN subjects sub ON s.subjectID = sub.id
    JOIN teachers t ON s.teacherID = t.id
    JOIN auditoriums a ON s.auditoriumID = a.id
    JOIN days d ON s.dayID = d.id
    WHERE a.buildingID = ?
      AND s.shift = ?
      AND s.startDate <= ?
      AND s.endDate >= ?
      AND (s.weekType = 'both' OR s.weekType = ?)
    ORDER BY a.name, s.dayID, s.timeSlotID
  `;

  const params = [buildingID, shift, weekEndDate, weekStartDate, weekType];

  db.all(query, params, (err, rows) => {
    if (err) return callback(err);

    const result = {};
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const maxSlot = shift === 1 ? 6 : 3;

    db.all(
      "SELECT name FROM auditoriums WHERE buildingID = ?",
      [buildingID],
      (err2, auditoriums) => {
        if (err2) return callback(err2);

        for (const { name: auditorium } of auditoriums) {
          result[auditorium] = {};
          for (const day of dayNames) {
            result[auditorium][day] = Array(maxSlot).fill(null);
          }
        }

        for (const row of rows) {
          const { auditoriumName, dayName, timeSlotID } = row;
          const daySlots = result[auditoriumName]?.[dayName];
          if (!daySlots) continue;

          daySlots[timeSlotID - 1] = {
            scheduleId: row.scheduleId,
            timeSlot: timeSlotID,
            subject: row.subject,
            teacher: row.teacher,
            isThisTeacher: row.teacherID === userID,
          };
        }

        callback(null, {
          buildingID,
          shift,
          weekNumber,
          weekStartDate,
          weekEndDate,
          weekType,
          lessons: result,
        });
      }
    );
  });
}

module.exports = {
  db,
  createUser,
  createBuilding,
  getAllBuildings,
  deleteBuildingById,
  getBuildingIdByName,
  getBuildingById,
  updateBuildingById,
  createAuditorium,
  getAuditoriumsByBuildingId,
  deleteAuditoriumsByBuildingId,
  getAuditoriumById,
  deleteAuditoriumById,
  updateAuditoriumById,
  createOrGetTeacher,
  createOrGetGroup,
  createOrGetSubject,
  addSchedule,
  getWeeklySchedule,
  getScheduleForWeeklyView,
};
