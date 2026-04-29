const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { Op } = require('sequelize');
const AppError = require('./errors/app-error');
const {
  normalizeLocation,
  validateDateRange
} = require('./utils/validation');
const {
  deleteUploadedReadings,
  importReadings
} = require('./services/reading-service');

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function createApp({
  sequelize,
  EnergyReading,
  readImportFile = async () => {
    const filePath = path.join(__dirname, 'data', 'energy_dump.json');
    const json = await fs.readFile(filePath, 'utf8');
    return JSON.parse(json);
  },
  httpClient = axios
}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get(
    '/api/health',
    asyncHandler(async (req, res) => {
      let dbStatus = 'ok';

      try {
        await sequelize.authenticate();
      } catch (error) {
        dbStatus = 'error';
      }

      res.json({
        status: 'ok',
        db: dbStatus
      });
    })
  );

  app.post(
    '/api/import/json',
    asyncHandler(async (req, res) => {
      const readings = await readImportFile();
      const summary = await importReadings({ EnergyReading, readings });

      res.json({
        success: true,
        summary,
        message: `Import completed: inserted=${summary.inserted}, skipped=${summary.skipped}, duplicates_detected=${summary.duplicates_detected}`
      });
    })
  );

  app.get(
    '/api/readings',
    asyncHandler(async (req, res) => {
      const { start, end, location } = req.query;
      const normalizedLocation = normalizeLocation(location);
      const { startDate, endDate } = validateDateRange(start, end);

      const readings = await EnergyReading.findAll({
        where: {
          location: normalizedLocation,
          timestamp: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        },
        order: [['timestamp', 'ASC']]
      });

      const formattedReadings = readings.map((reading) => ({
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
        location: normalizedLocation,
        dateRange: {
          start,
          end
        }
      });
    })
  );

  app.delete(
    '/api/readings',
    asyncHandler(async (req, res) => {
      const deletedCount = await deleteUploadedReadings({
        EnergyReading,
        source: req.query.source
      });

      res.json({
        success: true,
        deletedCount,
        message:
          deletedCount > 0
            ? `Deleted ${deletedCount} uploaded records.`
            : 'No UPLOAD records found.'
      });
    })
  );

  app.post(
    '/api/sync/prices',
    asyncHandler(async (req, res) => {
      let { start, end, location } = req.body || {};

      const now = new Date();
      const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');
      const defaultEnd = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

      start = start || defaultStart;
      end = end || defaultEnd;
      location = normalizeLocation(location || 'EE');

      const { startDate, endDate } = validateDateRange(start, end);
      const locationKey = location.toLowerCase();

      const response = await httpClient.get(
        'https://dashboard.elering.ee/api/nps/price',
        {
          params: {
            start,
            end,
            fields: locationKey
          }
        }
      );

      if (!response.data || !response.data.success || !response.data.data) {
        throw new AppError(503, 'PRICE_API_UNAVAILABLE');
      }

      const apiData = response.data.data;
      if (!apiData[locationKey]) {
        throw new AppError(404, `No data available for location ${location}`);
      }

      const priceData = apiData[locationKey];
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const entry of priceData) {
        try {
          const timestamp = new Date(entry.timestamp * 1000);
          if (Number.isNaN(timestamp.getTime())) {
            skipped++;
            continue;
          }

          const price = entry.price;
          if (price == null || typeof price !== 'number') {
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
            await existing.update({
              price_eur_mwh: price,
              source: 'API'
            });
            updated++;
            continue;
          }

          await EnergyReading.create({
            timestamp,
            location,
            price_eur_mwh: price,
            source: 'API'
          });
          inserted++;
        } catch (error) {
          skipped++;
        }
      }

      res.json({
        success: true,
        summary: {
          inserted,
          updated,
          skipped
        },
        message: `API data fetch completed: inserted=${inserted}, updated=${updated}, skipped=${skipped}`,
        location,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      });
    })
  );

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found'
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const statusCode = error.statusCode || 500;
    const safeMessage =
      statusCode >= 500 ? 'Internal server error' : error.message;

    if (statusCode >= 500) {
      console.error('Unhandled server error:', error);
    }

    res.status(statusCode).json({
      success: false,
      error: safeMessage
    });
  });

  return app;
}

module.exports = createApp;
