const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const sequelize = require('./utils/db');
const { DataTypes, Op } = require('sequelize');

const EnergyReading = sequelize.define('EnergyReading', {
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
}, {
  tableName: 'EnergyReadings'
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';

  try {
    await sequelize.authenticate();
  } catch (err) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    db: dbStatus
  });
});

app.post('/api/import/json', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'energy_dump.json');
    const json = await fs.readFile(filePath, 'utf8');
    const readings = JSON.parse(json);

    let inserted = 0;
    let skipped = 0;
    let duplicates_detected = 0;

    for (const reading of readings) {
      try {
        const timestampValue = reading.timestamp;
        if (!timestampValue || typeof timestampValue !== 'string') {
          skipped++;
          continue;
        }

        if (!timestampValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
          skipped++;
          continue;
        }

        const timestamp = new Date(timestampValue);
        if (Number.isNaN(timestamp.getTime())) {
          console.log('Skipping: invalid date');
          skipped++;
          continue;
        }

        let location = reading.location || 'EE';
        location = location.trim().toUpperCase();

        if (!['EE', 'LV', 'FI'].includes(location)) {
          location = 'EE'; // Default to EE for invalid locations
        }

        const price = reading.price_eur_mwh;
        if (price != null && typeof price !== 'number') {
          skipped++;
          continue;
        }

        const existing = await EnergyReading.findOne({
          where: {
            timestamp,
            location
          }
        });

        if (existing) {
          duplicates_detected++;
          skipped++;
          continue;
        }

        await EnergyReading.create({
          timestamp,
          location,
          price_eur_mwh: price != null ? price : null,
          source: 'UPLOAD'
        });

        inserted++;
      } catch (recordError) {
        console.error('Record processing error:', recordError);
        skipped++;
      }
    }

    res.json({
      success: true,
      summary: {
        inserted,
        skipped,
        duplicates_detected
      },
      message: `Import completed: inserted=${inserted}, skipped=${skipped}, duplicates_detected=${duplicates_detected}`
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      summary: {
        inserted: 0,
        skipped: 0,
        duplicates_detected: 0
      }
    });
  }
});

app.get('/api/readings', async (req, res) => {
  try {
    const { start, end, location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location parameter is required'
      });
    }

    const validLocations = ['EE', 'LV', 'FI'];
    if (!validLocations.includes(location.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location. Must be one of: EE, LV, FI'
      });
    }

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end parameters are required'
      });
    }

    const isoUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!isoUtcRegex.test(start)) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be in ISO 8601 format with UTC timezone (e.g., 2026-01-01T10:00:00Z)'
      });
    }
    if (!isoUtcRegex.test(end)) {
      return res.status(400).json({
        success: false,
        error: 'End date must be in ISO 8601 format with UTC timezone (e.g., 2026-01-01T10:00:00Z)'
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Start and end must be valid ISO 8601 UTC timestamps'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start must be before or equal to end'
      });
    }

    const whereConditions = {
      location: location.toUpperCase(),
      timestamp: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    };

    const readings = await EnergyReading.findAll({
      where: whereConditions,
      order: [['timestamp', 'ASC']]
    });

    const formattedReadings = readings.map(reading => ({
      id: reading.id,
      timestamp: reading.timestamp.toISOString(),
      location: reading.location,
      price_eur_mwh: reading.price_eur_mwh,
      source: reading.source,
      created_at: reading.createdAt.toISOString(),
      updated_at: reading.updatedAt.toISOString()
    }));

    res.json({
      success: true,
      data: formattedReadings,
      count: formattedReadings.length,
      location: location.toUpperCase(),
      dateRange: {
        start: start || null,
        end: end || null
      }
    });
  } catch (error) {
    console.error('Readings fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
}).catch(err => {
  console.error('Database sync error:', err);
});