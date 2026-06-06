const AppError = require('../errors/app-error');
const { parseUtcTimestamp } = require('../utils/validation');

async function importReadings({ EnergyReading, readings }) {
  let inserted = 0;
  let skipped = 0;
  let duplicates_detected = 0;

  for (const reading of readings) {
    try {
      const timestamp = parseUtcTimestamp(reading.timestamp, 'timestamp');

      let location = reading.location || 'EE';
      location = location.trim().toUpperCase();

      if (!['EE', 'LV', 'FI'].includes(location)) {
        location = 'EE';
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
    } catch (error) {
      skipped++;
    }
  }

  return {
    inserted,
    skipped,
    duplicates_detected
  };
}

async function deleteUploadedReadings({ EnergyReading, source }) {
  if (source !== 'UPLOAD') {
    throw new AppError(400, 'Only source=UPLOAD cleanup is allowed');
  }

  const deletedCount = await EnergyReading.destroy({
    where: {
      source: 'UPLOAD'
    }
  });

  return deletedCount;
}

module.exports = {
  deleteUploadedReadings,
  importReadings
};
