const pool = require('../database');

async function batteryRoutes(fastify, options) {

    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['device_id', 'chip_number', 'voltage', 'percent'],
                properties: {
                    device_id: { type: 'string', maxLength: 100 },
                    chip_number: { type: 'integer' },
                    voltage: { type: 'number' },
                    percent: { type: 'integer', minimum: 0, maximum: 100 },
                    slot_id: { type: 'string', maxLength: 50 },
                    nfc_id: { type: 'string', maxLength: 100 },

                }
            }
        }
    }, async (req, res) => {

        const { device_id, chip_number, voltage, percent, slot_id, nfc_id } = req.body;


        const result = await pool.query(
    `INSERT INTO battery_measurements
     (device_id, chip_number, voltage, percent, slot_id, nfc_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [device_id, chip_number, voltage, percent, slot_id, nfc_id]
);


        return {
            id: result.rows[0].id,
            created_at: result.rows[0].created_at
        };
    });

    fastify.get('/', async () => {
        const results = await pool.query(
            `SELECT *
             FROM battery_measurements
             ORDER BY created_at DESC
             LIMIT 50`
        );

        return results.rows;
    });

    fastify.get('/validate', async () => {
        const result = await pool.query(
            `SELECT * FROM battery_measurements
             WHERE voltage < 2.40
                OR voltage > 3.60
                OR percent < 0
                OR percent > 100
                OR slot_id IS NULL
             ORDER BY created_at DESC`
        );

        return {
            invalid_count: result.rows.length,
            invalid_entries: result.rows
        };
    });
}

module.exports = batteryRoutes;