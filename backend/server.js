require("dotenv").config();

const initDatabase = require('./init-db');

const fastify = require('fastify')({
    logger: true
});

const cors = require('@fastify/cors');
const batteryRoutes = require('./routes/battery');

// NFC STORAGE
global.currentNfc = null;

fastify.register(cors);

// NFC ENDPOINT
fastify.post('/api/nfc', async (req, res) => {
    const { nfc_id } = req.body;

    if (!nfc_id || nfc_id.trim() === '') {
        return res.code(400).send({ error: "Invalid NFC ID" });
    }

    global.currentNfc = nfc_id;

    console.log("NFC Stored:", global.currentNfc);

    return {
        status: 'stored',
        nfc_id: global.currentNfc
    };
});

// debug endpoint
fastify.get('/api/nfc', async () => {
    return { currentNfc: global.currentNfc };
});

// EXISTING ROUTES
fastify.register(batteryRoutes, { prefix: '/api/battery' });

fastify.get('/api/health', async () => {
    return { status: 200 };
});

const start = async () => {
    try {
        await initDatabase();

        await fastify.listen({
            port: process.env.PORT,
            host: '0.0.0.0',
        });

        console.log("🚀 Server running");
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();