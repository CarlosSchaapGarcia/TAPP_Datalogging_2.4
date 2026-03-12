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
                }
            }
        }
    }, async (req, res) => {

        console.log('BODY:', req.body);

        const { device_id, chip_number, voltage, percent } = req.body;

        const result = await pool.query(
            `INSERT INTO battery_measurements
             (device_id, chip_number, voltage, percent)
             VALUES ($1, $2, $3, $4)
             RETURNING id, created_at`,
            [device_id, chip_number, voltage, percent]
        );

        console.log('INSERTED:', result.rows[0]);

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
}

module.exports = batteryRoutes;