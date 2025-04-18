// src/controllers/auth/index.js
const { CustomError } = require("../../components/customError");
const { createUser, db } = require("../../db/db");
const { RegisterValidation } = require("./validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  userFindByUsernameForLogin: userFindByUsername,
} = require("../../db/queries");
const {
  saveRefreshToken,
  findRefreshToken,
  saveAccessToken,
  deleteAccessToken,
  deleteRefreshToken,
} = require("./tokenController");

const register = (req, res) => {
  try {
    const userData = new RegisterValidation(req.body);

    createUser(userData, (err, result) => {
      if (err) {
        if (err instanceof CustomError) {
          return res.status(err.code).json({ error: err.message });
        }
        return res.status(500).json({ error: "Server xatosi" });
      }

      res.status(201).json({ message: "User created" });
    });
  } catch (error) {
    const status = error.code || 400;
    res.status(status).json({ error: error.message });
  }
};

const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username va parol majburiy" });
  }

  db.get(
    userFindByUsername,
    [username.toLowerCase().trim()],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Bazaga ulanishda xatolik" });
      }

      if (!user) {
        return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Parol noto‘g‘ri" });
      }

      // 🔐 Tokenlar yaratish
      const payload = { sub: user.id };

      const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
      });

      const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      // Foydaluvchiga malumot yuborishdan oldin Refresh tokenni saqlab olishj

      const ip = req.ip || req.connection.remoteAddress;
      const user_agent = req.headers["user-agent"];
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(); // 7 kun

      const expiresAtAccess = new Date(
        Date.now() + 15 * (60 * 1000)
      ).toISOString(); // 15 daqiqa
      saveRefreshToken(
        {
          user_id: user.id,
          token: refreshToken,
          user_agent,
          ip,
          expires_at: expiresAt,
        },
        (err) => {
          if (err) {
            console.error("❌ Refresh tokenni saqlashda xatolik:", err.message);
            return res.status(500).json({ error: "Tokenni saqlashda xatolik" });
          }

          // 5. Javob
          res.status(200).json({
            sub: user.id,
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      );

      saveAccessToken(
        {
          user_id: user.id,
          token: accessToken,
          expires_at: expiresAtAccess,
        },
        (err) => {
          if (err) {
            console.error("❌ Access tokenni saqlashda xatolik:", err.message);
            return res.status(500).json({ error: "Tokenni saqlashda xatolik" });
          }
        }
      );
    }
  );
};

const refreshToken = (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Refresh token talab qilinadi" });
  }

  // 1. JWT ni tekshiramiz
  jwt.verify(
    refresh_token,
    process.env.REFRESH_TOKEN_SECRET,
    (err, decoded) => {
      if (err || !decoded?.sub) {
        return res
          .status(403)
          .json({ error: "Refresh token noto‘g‘ri yoki muddati tugagan" });
      }

      findRefreshToken(refresh_token, (dbErr, tokenRow) => {
        if (dbErr) {
          console.error(
            "❌ Tokenni bazadan tekshirishda xatolik:",
            dbErr.message
          );
          return res.status(500).json({ error: "Server xatoligi" });
        }

        if (!tokenRow) {
          return res.status(403).json({
            error:
              "Ushbu refresh token tizimda mavjud emas (yoki bekor qilingan)",
          });
        }

        const now = new Date();
        if (new Date(tokenRow.expires_at) < now) {
          return res.status(403).json({
            error: "Refresh token muddati tugagan. Qayta login qiling.",
          });
        }

        const payload = { sub: decoded.sub };
        const newAccessToken = jwt.sign(
          payload,
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "15m",
          }
        );

        const expiresAtAccess = new Date(
          Date.now() + 15 * (60 * 1000)
        ).toISOString();

        saveAccessToken(
          {
            user_id: decoded.sub,
            token: newAccessToken,
            expires_at: expiresAtAccess,
          },
          (err) => {
            if (err) {
              console.error(
                "❌ Access tokenni saqlashda xatolik:",
                err.message
              );
              return res
                .status(500)
                .json({ error: "Tokenni saqlashda xatolik" });
            }
          }
        );

        res.status(200).json({
          access_token: newAccessToken,
        });
      });
    }
  );
};

const logout = (req, res) => {
  const token = req.token;

  console.log("USER TOKEN");

  if (!token) {
    return res.status(401).json({ error: "Token talab qilinadi" });
  }

  deleteAccessToken(token, (err) => {
    if (err) {
      return res.status(500).json({ error: "Tokenni o‘chirishda xatolik" });
    }
    res.status(200).json({ message: "Muvaffaqiyatli chiqish" });
  });
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
};
