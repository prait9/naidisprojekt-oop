const express = require('express');
const cors = require('cors');
const sequelize = require('./utils/db');

const app = express();
app.use(cors());
app.use(express.json());


app.get("/api/health", async (req, res) => {
  let dbStatus = "ok";

  try {
    await sequelize.authenticate();
  } catch (err) {
    dbStatus = "error";
  }

  res.json({
    status: "ok",
    db: dbStatus
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});