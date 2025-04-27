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

function getAllBuildings(filters, callback) {
  let selectBuildingsSQL = `
    SELECT * FROM buildings
  `;
  const conditions = [];
  const params = [];

  if (filters.name) {
    conditions.push("name LIKE ?");
    params.push(`%${filters.name}%`);
  }

  if (filters.address) {
    conditions.push("address LIKE ?");
    params.push(`%${filters.address}%`);
  }

  if (conditions.length > 0) {
    selectBuildingsSQL += ` WHERE ${conditions.join(" AND ")}`;
  }

  db.all(selectBuildingsSQL, params, (err, rows) => {
    if (err) {
      return callback(err);
    }
    callback(null, rows);
  });
}

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

module.exports = {
  db,
  createUser,
  createBuilding,
  getAllBuildings,
  deleteBuildingById,
};
