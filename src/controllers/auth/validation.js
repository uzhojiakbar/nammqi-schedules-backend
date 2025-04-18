const bcrypt = require("bcrypt");
const { CustomError } = require("../../components/customError");

class RegisterValidation {
  constructor({ username, password, firstname, lastname, role = "user" }) {
    this.validateFirstname(firstname);
    this.validatePassword(password);

    this.username = username.toLowerCase().trim();
    this.password = this.hashPassword(password.trim()); // 🔥 bu yerda hash bo‘ladi
    this.firstname = firstname?.trim();
    this.lastname = lastname?.trim();
    this.role = "user";
  }

  validateFirstname(name) {
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      throw new CustomError(
        400,
        "Ism to‘liq va kamida 3 ta belgi bo‘lishi kerak"
      );
    }
  }

  validatePassword(password) {
    if (!password || typeof password !== "string" || password.length < 6) {
      throw new CustomError(400, "Parol kamida 6 ta belgi bo‘lishi kerak");
    }
  }

  hashPassword(password) {
    try {
      const hash = bcrypt.hashSync(password, 10); // 🔥 Sync versiyasi
      return hash;
    } catch (err) {
      throw new CustomError(500, "Parolni hash qilishda xatolik");
    }
  }
}

module.exports = { RegisterValidation };
