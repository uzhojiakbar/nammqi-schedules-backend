const userFindByUsername = `SELECT id FROM users WHERE username = ?`;
const userFindByUsernameForLogin = `SELECT id, password FROM users WHERE username = ?`;

const insertUser = `
    INSERT INTO users (id, username, password, firstname, lastname, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

module.exports = { userFindByUsername, insertUser, userFindByUsernameForLogin };
