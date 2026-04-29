const sequelize = require('./utils/db');
const createApp = require('./app');
const createEnergyReadingModel = require('./models/energy-reading');

const EnergyReading = createEnergyReadingModel(sequelize);
const app = createApp({ sequelize, EnergyReading });

sequelize
  .sync()
  .then(() => {
    console.log('Database synced');
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch((error) => {
    console.error('Database sync error:', error);
  });
