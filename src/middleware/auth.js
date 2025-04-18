// 📁 src/middleware/authenticateToken.js
const jwt = require("jsonwebtoken");
const { db } = require("../db/db");
const { findAccessToken } = require("../controllers/auth/tokenController");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token talab qilinadi" });
  }

  findAccessToken(token, (err, tokenData) => {
    if (err) {
      return res.status(500).json({ error: "Tokenni tekshirishda xatolik" });
    }

    if (!tokenData) {
      return res.status(403).json({ error: "Token bazada mavjud emas" });
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (expiresAt < now) {
      return res.status(403).json({
        error: "Token muddati tugagan. Iltimos, qayta login qiling.",
      });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Token noto‘g‘ri yoki buzilgan" });
      }

      req.user = decoded;
      req.token = token;

      const selectUserQuery = `
        SELECT id, username, firstname, lastname, role
        FROM users WHERE id = ?
      `;

      db.get(selectUserQuery, [decoded.sub], (dbErr, userInfo) => {
        if (dbErr) {
          return res
            .status(500)
            .json({ error: "Foydalanuvchini olishda xatolik" });
        }

        if (!userInfo) {
          return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
        }

        req.userInfo = userInfo;
        next();
      });
    });
  });
}

function authorizeAdmin(req, res, next) {
  if (req.userInfo?.role !== "admin") {
    return res.status(403).json({ error: "Faqat adminlar ruxsat oladi" });
  }
  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
};
