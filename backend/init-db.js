const pool = require('./database');

async function initDatabase() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS battery_measurements (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) NOT NULL,
        chip_number INTEGER NOT NULL,
        voltage NUMERIC(6,3) NOT NULL,
        percent INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
    ALTER TABLE battery_measurements
    ADD COLUMN IF NOT EXISTS slot_id VARCHAR(50);
`);

await pool.query(`
    ALTER TABLE battery_measurements
    ADD COLUMN IF NOT EXISTS nfc_id VARCHAR(100);
`);


        console.log('Database table ensured');
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

module.exports = initDatabase;