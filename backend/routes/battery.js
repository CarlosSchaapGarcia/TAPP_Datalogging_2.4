const pool = require('../database');

async function batteryRoutes(fastify, options) {

    // ── POST ──
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['slot_id', 'voltage', 'percent'],
                properties: {
                    slot_id: { type: 'string', maxLength: 50 },
                    voltage: { type: 'number' },
                    percent: { type: 'integer', minimum: 0, maximum: 100 }
                }
            }
        }
    }, async (req, res) => {

        const { slot_id, voltage, percent } = req.body;

        // 🔥 Get NFC from backend memory
        const nfc_id = global.currentNfc;

        if (!nfc_id) {
            return res.code(400).send({
                error: "No NFC scanned yet"
            });
        }

        // Extra runtime validation
        if (voltage < 0 || voltage > 5) {
            return res.code(400).send({
                error: "Invalid voltage range"
            });
        }

        const result = await pool.query(
            `INSERT INTO battery_measurements
             (slot_id, nfc_id, voltage, percent)
             VALUES ($1, $2, $3, $4)
             RETURNING id, created_at`,
            [slot_id, nfc_id, voltage, percent]
        );

        console.log("📦 Stored:", {
            slot_id,
            nfc_id,
            voltage,
            percent
        });

        return {
            id: result.rows[0].id,
            created_at: result.rows[0].created_at,
            nfc_id
        };
    });

    // ── GET latest ──
    fastify.get('/', async () => {
        const results = await pool.query(
            `SELECT *
             FROM battery_measurements
             ORDER BY created_at DESC
             LIMIT 50`
        );

        return results.rows;
    });

    // ── GET validation ──
    fastify.get('/validate', async () => {
        const result = await pool.query(
            `SELECT * FROM battery_measurements
             WHERE voltage < 2.40
                OR voltage > 3.60
                OR percent < 0
                OR percent > 100
                OR slot_id IS NULL
                OR nfc_id IS NULL
                OR nfc_id = ''
             ORDER BY created_at DESC`
        );

        return {
            invalid_count: result.rows.length,
            invalid_entries: result.rows
        };
    });
}

module.exports = batteryRoutes;