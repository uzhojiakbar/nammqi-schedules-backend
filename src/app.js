require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger/swagger.json");
const routes = require("./routes/index");

const app = express();
app.use(express.json());
app.use(cors());

// Middleware
app.use(
  process.env.SWAGGER_URL || "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// Routes
app.use("/api", routes);

// Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send("Something broke!");
// });

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `📖 Swagger UI: http://localhost:${process.env.PORT}${process.env.SWAGGER_URL}`
  );
});
