const { db } = require("../../db/db");
const { v4: uuidv4 } = require("uuid");

function saveRefreshToken(
  { user_id, token, user_agent, ip, expires_at },
  callback
) {
  const id = uuidv4();

  const insertSQL = `
    INSERT INTO refresh_tokens (id, user_id, token, user_agent, ip, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    insertSQL,
    [id, user_id, token, user_agent, ip, expires_at],
    function (err) {
      if (err) return callback(err);
      callback(null, { id });
    }
  );
}

function findRefreshToken(token, callback) {
  const query = `SELECT * FROM refresh_tokens WHERE token = ?`;
  db.get(query, [token], (err, row) => {
    if (err) return callback(err);
    callback(null, row);
  });
}

function deleteRefreshToken(token, callback) {
  const query = `DELETE FROM refresh_tokens WHERE token = ?`;
  db.run(query, [token], function (err) {
    if (err) return callback(err);
    callback(null, { deleted: this.changes > 0 });
  });
}

function deleteAllUserTokens(user_id, callback) {
  const query = `DELETE FROM refresh_tokens WHERE user_id = ?`;
  db.run(query, [user_id], function (err) {
    if (err) return callback(err);
    callback(null, { deleted: this.changes });
  });
}

// --- access tokenlar uchun --- //

function saveAccessToken({ user_id, token, expires_at }, callback) {
  const id = uuidv4();
  const insertSQL = `
    INSERT INTO access_tokens (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `;

  db.run(insertSQL, [id, user_id, token, expires_at], function (err) {
    if (err) return callback(err);
    callback(null, { id });
  });
}

function findAccessToken(token, callback) {
  const query = `SELECT * FROM access_tokens WHERE token = ?`;
  db.get(query, [token], (err, row) => {
    if (err) return callback(err);
    callback(null, row);
  });
}

function deleteAccessToken(token, callback) {
  const query = `DELETE FROM access_tokens WHERE token = ?`;
  db.run(query, [token], function (err) {
    if (err) return callback(err);
    callback(null, { deleted: this.changes > 0 });
  });
}

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserTokens,
  saveAccessToken,
  findAccessToken,
  deleteAccessToken,
};
