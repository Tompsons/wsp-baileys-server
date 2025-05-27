const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    API_ENDPOINT: process.env.API_ENDPOINT || 'http://127.0.0.1:8000/conversation',
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    PG_USER: process.env.PG_USER,
    PG_HOST: process.env.PG_HOST,
    PG_DATABASE: process.env.PG_DATABASE,
    PG_PASSWORD: process.env.PG_PASSWORD,
    PG_PORT: process.env.PG_PORT,
};