const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../app');

function createFakeEnergyReading(overrides = {}) {
  return {
    findOne: async () => null,
    findAll: async () => [],
    create: async (payload) => payload,
    destroy: async () => 0,
    ...overrides
  };
}

async function withServer(app, callback) {
  const server = await new Promise((resolve) => {
    const startedServer = app.listen(0, () => resolve(startedServer));
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('POST /api/import/json skips invalid timestamps and reports duplicates_detected', async () => {
  const createdRows = [];
  const existingKeys = new Set(['2026-01-01T00:00:00.000Z|EE']);
  const EnergyReading = createFakeEnergyReading({
    findOne: async ({ where }) => {
      const key = `${where.timestamp.toISOString()}|${where.location}`;
      return existingKeys.has(key) ? { id: 99 } : null;
    },
    create: async (payload) => {
      const key = `${payload.timestamp.toISOString()}|${payload.location}`;
      existingKeys.add(key);
      createdRows.push(payload);
      return payload;
    }
  });

  const app = createApp({
    sequelize: { authenticate: async () => true },
    EnergyReading,
    readImportFile: async () => [
      {
        timestamp: '2026-01-01T00:00:00Z',
        location: 'EE',
        price_eur_mwh: 100
      },
      {
        timestamp: 'not-a-date',
        location: 'LV',
        price_eur_mwh: 80
      },
      {
        timestamp: '2026-01-01T01:00:00Z',
        location: 'FI',
        price_eur_mwh: 120
      }
    ]
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/import/json`, {
      method: 'POST'
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.summary, {
      inserted: 1,
      skipped: 2,
      duplicates_detected: 1
    });
    assert.equal(createdRows.length, 1);
    assert.equal(createdRows[0].source, 'UPLOAD');
  });
});

test('GET /api/readings returns a safe validation error for invalid date input', async () => {
  let findAllCalled = false;
  const app = createApp({
    sequelize: { authenticate: async () => true },
    EnergyReading: createFakeEnergyReading({
      findAll: async () => {
        findAllCalled = true;
        return [];
      }
    })
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/readings?location=EE&start=2026-01-01&end=2026-01-02T00:00:00Z`
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(
      body.error,
      'start must be a valid ISO 8601 UTC timestamp with timezone info'
    );
    assert.equal(findAllCalled, false);
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'stack'), false);
  });
});

test('DELETE /api/readings?source=UPLOAD removes only uploaded records', async () => {
  const app = createApp({
    sequelize: { authenticate: async () => true },
    EnergyReading: createFakeEnergyReading({
      destroy: async ({ where }) => {
        assert.deepEqual(where, { source: 'UPLOAD' });
        return 3;
      }
    })
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/readings?source=UPLOAD`, {
      method: 'DELETE'
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.message, 'Deleted 3 uploaded records.');
  });
});
