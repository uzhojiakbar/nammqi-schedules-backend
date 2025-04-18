const { db } = require("../../db/db");
const bcrypt = require("bcrypt");
const {
  deleteAccessToken,
  deleteRefreshToken,
} = require("../auth/tokenController");

const getMe = (req, res) => {
  const query = `SELECT id, username, firstname, lastname,  role FROM users WHERE id = ?`;
  db.get(query, [req.user.sub], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "SQLITE3 ga ulanishda xatolik" });
    }
    if (!row) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
    res.status(200).json(row);
  });
};

const deleteMe = (req, res) => {
  const deleteUserQuery = `DELETE FROM users WHERE id = ?`;
  const deleteTokenQuery = `DELETE FROM refresh_tokens WHERE user_id = ?`;

  db.run(deleteUserQuery, [req.user.sub], function (err) {
    if (err)
      return res
        .status(500)
        .json({ error: "Foydalanuvchini o‘chirishda xatolik" });

    db.run(deleteTokenQuery, [req.user.sub], function (tokenErr) {
      if (tokenErr)
        return res.status(500).json({ error: "Tokenni o‘chirishda xatolik" });

      res.status(200).json({
        message: "Profil va barcha refresh tokenlar muvaffaqiyatli o‘chirildi",
      });
    });
  });
};

const comparePassword = (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Parol talab qilinadi" });
  db.get(
    `SELECT password FROM users WHERE id = ?`,
    [req.user.sub],
    async (err, row) => {
      if (err)
        return res.status(500).json({ error: "Bazadan o‘qishda xatolik" });
      const match = await bcrypt.compare(password, row.password);
      res.status(200).json({ response: match });
    }
  );
};

const changePassword = (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({
      error:
        "Parollar to‘liq va yangi parol kamida 6 belgidan iborat bo‘lishi kerak",
    });
  }
  db.get(
    `SELECT password FROM users WHERE id = ?`,
    [req.user.sub],
    async (err, row) => {
      if (err)
        return res.status(500).json({ error: "Bazadan o‘qishda xatolik" });
      if (!row)
        return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      const match = await bcrypt.compare(oldPassword, row.password);
      if (!match)
        return res.status(401).json({ error: "Eski parol noto‘g‘ri" });

      const hash = bcrypt.hashSync(newPassword, 10);
      db.run(
        `UPDATE users SET password = ? WHERE id = ?`,
        [hash, req.user.sub],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Parolni yangilashda xatolik" });
          res.status(200).json({ message: "Parol muvaffaqiyatli yangilandi" });
        }
      );
    }
  );
};

const updateProfile = (req, res) => {
  const { firstname, lastname, role } = req.body;
  const selectQuery = `SELECT * FROM users WHERE id = ?`;
  db.get(selectQuery, [req.user.sub], (err, user) => {
    if (err)
      return res.status(500).json({ error: "Ma’lumotni olishda xatolik" });
    if (!user)
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    const updatedFirstname = firstname || user.firstname;
    const updatedLastname = lastname || user.lastname;
    const updatedRole = user.role;

    const updateQuery = `UPDATE users SET firstname = ?, lastname = ?,  role = ? WHERE id = ?`;
    db.run(
      updateQuery,
      [updatedFirstname, updatedLastname, updatedRole, req.user.sub],
      function (err) {
        if (err) return res.status(500).json({ error: "Yangilashda xatolik" });
        res.status(200).json({ message: "Profil yangilandi" });
      }
    );
  });
};

// const deleteUserByAdmin = (req, res) => {
//     const query = `DELETE FROM users WHERE id = ?`;
//     db.run(query, [req.params.id], function (err) {
//       if (err) return res.status(500).json({ error: "Admin o‘chirishda xatolik" });
//       res.status(200).json({ message: "Foydalanuvchi o‘chirildi" });
//     });
//   };

//   const resetPasswordByAdmin = (req, res) => {
//     const defaultPassword = "123456";
//     const hash = bcrypt.hashSync(defaultPassword, 10);
//     const query = `UPDATE users SET password = ? WHERE id = ?`;
//     db.run(query, [hash, req.params.id], function (err) {
//       if (err) return res.status(500).json({ error: "Parolni reset qilishda xatolik" });
//       res.status(200).json({ message: "Parol muvaffaqiyatli tiklandi", newPassword: defaultPassword });
//     });
//   };

module.exports = {
  getMe,
  deleteMe,
  comparePassword,
  changePassword,
  updateProfile,
};
