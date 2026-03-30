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

        console.log('Database table ensured');
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

module.exports = initDatabase;
