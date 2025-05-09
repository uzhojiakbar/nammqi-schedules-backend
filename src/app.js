require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger/swagger.json");
const routes = require("./routes/index");
const { Readable } = require("stream");

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

app.get("/api/for-test/large-json", (req, res) => {
  const data = generateLargeObject(100000); // katta obyekt

  const jsonString = JSON.stringify(data);
  const readable = Readable.from(jsonString);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Length", Buffer.byteLength(jsonString));
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');


  readable.pipe(res);
});

function generateLargeObject(size) {
  const result = {};
  for (let i = 0; i < size; i++) {
    result[`key_${i}`] = `value_${i}`;
  }
  return result;
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `📖 Swagger UI: http://localhost:${process.env.PORT}${process.env.SWAGGER_URL}`
  );
});
