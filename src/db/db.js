require("dotenv").config();
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const { CustomError } = require("../components/customError");
const { userFindByUsername, insertUser } = require("./queries");

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
  }
});

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
  db.get("SELECT id FROM buildings WHERE name = ?", [buildingName], (err, row) => {
    if (err) return callback(new CustomError(500, "Bazada xatolik"));
    if (!row) return callback(new CustomError(400, `Bino topilmadi: ${buildingName}`));
    callback(null, row.id);
  });
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
      console.error("❌ Auditoriyalar jadvalini yaratishda xatolik:", err.message);
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

    db.get("SELECT id FROM buildings WHERE id = ?", [buildingID], (err, buildingRow) => {
      if (err) return callbackInner(new CustomError(500, "Bazada xatolik yuz berdi"));
      if (!buildingRow) {
        return callbackInner(new CustomError(400, `Bunday IDdagi bino topilmadi: ${buildingID}`));
      }
    })

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

function getAuditoriumsByBuildingId(buildingId, filters, page = 1, size = 10, callback) {
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
        return callback(new CustomError(404, "Bu binoda auditoriyalar topilmadi"));
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
      return callback(new CustomError(404, "Bunday ID bilan auditoriya topilmadi"));
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
    }

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
      return callback(new CustomError(404, "Bu bino ga tegishli auditoriyalar topilmadi"));
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
      return callback(new CustomError(404, "Bunday ID bilan Audotiriya topilmadi"));
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
    "description"
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
      return callback(new CustomError(404, "Bunday ID bilan auditoriya topilmadi"));
    }

    // Updated auditoriya qaytariladi
    db.get("SELECT * FROM auditoriums WHERE id = ?", [id], (err, row) => {
      if (err || !row) {
        return callback(new CustomError(500, "Yangilangan auditoriya topilmadi"));
      }
      callback(null, row);
    });
  });
};


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
  updateAuditoriumById
};
