require("dotenv").config();

const initDatabase = require('./init-db');

const fastify = require('fastify')({
    logger: true
});

const cors = require('@fastify/cors');
const batteryRoutes = require('./routes/battery');

fastify.register(cors);
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
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();