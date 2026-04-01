require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
});

// When a client connects
pool.on('connect', () => {
    console.log("Connected to the database");
});

// Catch pool errors (VERY IMPORTANT)
pool.on('error', (err) => {
    console.error("Unexpected DB error:", err);
});

// Optional: test connection immediately
(async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("🧪 DB test OK:", res.rows[0]);
    } catch (err) {
        console.error("DB connection failed:", err);
    }
})();

module.exports = pool;