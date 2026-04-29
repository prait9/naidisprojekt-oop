const AppError = require('../errors/app-error');

const ISO_8601_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
const VALID_LOCATIONS = ['EE', 'LV', 'FI'];

function isUtcOffset(offset) {
  return offset === 'Z' || offset === '+00:00' || offset === '-00:00';
}

function parseUtcTimestamp(value, fieldName) {
  if (typeof value !== 'string' || !ISO_8601_WITH_TIMEZONE.test(value)) {
    throw new AppError(
      400,
      `${fieldName} must be a valid ISO 8601 UTC timestamp with timezone info`
    );
  }

  const timezoneOffset = value.match(/(Z|[+-]\d{2}:\d{2})$/)?.[1];
  if (!isUtcOffset(timezoneOffset)) {
    throw new AppError(400, `${fieldName} must use UTC timezone`);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(
      400,
      `${fieldName} must be a valid ISO 8601 UTC timestamp with timezone info`
    );
  }

  return parsedDate;
}

function normalizeLocation(location) {
  if (typeof location !== 'string') {
    throw new AppError(400, 'Location parameter is required');
  }

  const normalizedLocation = location.trim().toUpperCase();
  if (!VALID_LOCATIONS.includes(normalizedLocation)) {
    throw new AppError(400, 'Invalid location. Must be one of: EE, LV, FI');
  }

  return normalizedLocation;
}

function validateDateRange(start, end) {
  if (!start || !end) {
    throw new AppError(400, 'Start and end parameters are required');
  }

  const startDate = parseUtcTimestamp(start, 'start');
  const endDate = parseUtcTimestamp(end, 'end');

  if (endDate <= startDate) {
    throw new AppError(400, 'end must be greater than start');
  }

  return { startDate, endDate };
}

module.exports = {
  ISO_8601_WITH_TIMEZONE,
  VALID_LOCATIONS,
  normalizeLocation,
  parseUtcTimestamp,
  validateDateRange
};
