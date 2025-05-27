const { Pool } = require('pg');
const { PG_USER, PG_HOST, PG_DATABASE, PG_PASSWORD, PG_PORT } = require('./environment');

const pgPool = new Pool({
    user: PG_USER,
    host: PG_HOST,
    database: PG_DATABASE,
    password: PG_PASSWORD,
    port: parseInt(PG_PORT, 10),
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pgPool;