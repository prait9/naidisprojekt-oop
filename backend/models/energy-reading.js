const { DataTypes } = require('sequelize');

function createEnergyReadingModel(sequelize) {
  return sequelize.define(
    'EnergyReadings',
    {
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false
      },
      price_eur_mwh: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      source: {
        type: DataTypes.ENUM('UPLOAD', 'API')
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: 'EnergyReadings'
    }
  );
}

module.exports = createEnergyReadingModel;
