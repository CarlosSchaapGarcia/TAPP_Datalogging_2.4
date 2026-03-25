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
        `);

        console.log('Database table ensured');

        process.exit(0);
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

initDatabase();