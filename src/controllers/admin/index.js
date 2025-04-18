// 📁 src/controllers/admin/index.js
const { db } = require("../../db/db");

const getAllUsers = (req, res) => {
  const { firstname, lastname, username } = req.query;

  let baseQuery = `SELECT id, username, firstname, lastname,  role FROM users`;
  const conditions = [];
  const params = [];

  console.log("Query params:", req.query);

  if (firstname) {
    conditions.push("firstname LIKE ?");
    params.push(`%${firstname}%`);
  }
  if (lastname) {
    conditions.push("lastname LIKE ?");
    params.push(`%${lastname}%`);
  }
  if (username) {
    conditions.push("username LIKE ?");
    params.push(`%${username}%`);
  }

  if (conditions.length) {
    baseQuery += ` WHERE ` + conditions.join(" AND ");
  }

  db.all(baseQuery, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Server xatoligi" });
    res.status(200).json({
      users: rows,
      usersCount: rows.length,
      adminsCount: rows.filter((u) => u.role === "admin").length,
      teachersCount: rows.filter((u) => u.role === "teacher").length,
    });
  });
};

module.exports = { getAllUsers };
