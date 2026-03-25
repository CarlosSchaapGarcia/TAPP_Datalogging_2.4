const pool = require('./database');

async function initDatabase() {
    try {
        console.log("Running DB migration...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS battery_measurements (
                id SERIAL PRIMARY KEY,
                slot_id VARCHAR(50) NOT NULL,
                nfc_id VARCHAR(100) NOT NULL,
                voltage NUMERIC(6,3) NOT NULL,
                percent INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
                );

            CREATE INDEX IF NOT EXISTS idx_nfc_id
                ON battery_measurements(nfc_id);
        `);

        console.log('Database table ensured');
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

// Only run if executed directly (safe)
if (require.main === module) {
    initDatabase().then(() => process.exit(0));
}

module.exports = initDatabase;