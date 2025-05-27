const { PG_USER, PG_HOST, PG_DATABASE, PG_PASSWORD, PG_PORT } = require('../config/environment');
const { Pool } = require('pg');

class PostgresService {
    constructor() {
        this.pgPool = new Pool({
            user:process.env.PG_USER,
            host: process.env.PG_HOST,
            database: process.env.PG_DATABASE,
            password: process.env.PG_PASSWORD,
            port: parseInt('5432', 10),
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    async testConnection() {
        try {
            const result = await this.pgPool.query('SELECT NOW()');
            console.log('Successfully connected to the database', result.rows[0].now);
            return true;
        } catch (err) {
            console.error('Error connecting to the database:', err.message);
            console.error('Database connection details:');
            console.error(`Host: ${PG_HOST}`);
            console.error(`Database: ${PG_DATABASE}`);
            console.error(`User: ${PG_USER}`);
            console.error(`Port: ${PG_PORT}`);
            // Don't log the password for security reasons
            return false;
        }
    }

    async updateNumberCelInConversations(conversationId, numberCel, aliasWsp, clientId) {

        const isConnected = await this.testConnection(); // Verificar si hay conexión

        if (!isConnected) {
            console.error("Connection to PostgreSQL failed. Aborting update.");
            return;
        }   

        const updateQuery = `
            UPDATE ${clientId}.backbot_conversations
            SET number_cel = $1, alias_wsp = $3
            WHERE id_conversation = $2;
        `;

        // Mostrar el query completo en la consola
        console.log(`Executing query: ${updateQuery}`);
    
        try {
            await this.pgPool.query(updateQuery, [numberCel, conversationId, aliasWsp]);
            console.log(`number_cel updated for conversation_id: ${conversationId} and alias wsp : ${aliasWsp}`);
        } catch (error) {
            console.error("Error updating number_cel in conversations:", error);
            throw error;
        }
    }

    async isNumberBlacklisted(numberCel, clientId) {
        const query = `
            SELECT 1
            FROM ${clientId}.users_bannedphones
            WHERE number_cel = $1;
        `;
    
        try {
            const result = await this.pgPool.query(query, [numberCel]);
            return result.rows.length > 0;
        } catch (error) {
            console.error("Error checking blacklist for number_cel in PostgreSQL:", error);
            return false;
        }
    }
}

module.exports = PostgresService;