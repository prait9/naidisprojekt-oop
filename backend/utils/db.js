const { Sequelize } = require('sequelize');

const sequelize = new Sequelize("EnergyReadings", "root", "qwerty", {
  host: "localhost",
  dialect: "mysql",
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log("DB ühendus õnnestus!");
  } catch (err) {
    console.error("DB ühenduse viga:", err);
  }
})();

module.exports = sequelize;