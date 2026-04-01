const pool = require('./database');

async function waitForDatabase(maxAttempts = 15, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await pool.query('SELECT 1');
            console.log('Database connection ready');
            return;
        } catch (err) {
            if (attempt === maxAttempts) {
                throw err;
            }

            console.log(`Database not ready yet (attempt ${attempt}/${maxAttempts}), retrying...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

async function initDatabase() {
    try {
        await waitForDatabase();
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
