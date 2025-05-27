const AWS = require('../config/aws');
const { DYNAMODB_TABLE_CONVERSATIONS, DYNAMODB_TABLE_CONVERSATIONS_AND_CELS } = require('../config/environment');
class DynamoDBService {
    constructor() {
        this.dynamoDb = new AWS.DynamoDB.DocumentClient();
        this.tableConversationsAndCels = process.env.DYNAMODB_TABLE_CONVERSATIONS_AND_CELS;
        this.tableConversations = process.env.DYNAMODB_TABLE_CONVERSATIONS;
        this.tableServerlessSonia = process.env.DYNAMODB_TABLE_CONFIG;
    }

    async testConnection() {
        const params = {
            TableName: this.tableConversationsAndCels,
            Limit: 1
        };

        try {
            const result = await this.dynamoDb.scan(params).promise();
            console.log("DynamoDB connection test successful. Items found:", result.Items.length);
            return true;
        } catch (error) {
            console.error("DynamoDB connection test failed:", error.message);
            return false;
        }
    }

    checkConfiguration() {
        if (!this.dynamoDb) {
            console.error("DynamoDB client is not initialized");
        } else {
            console.log("DynamoDB client is initialized");
        }
        
        if (!this.tableConversationsAndCels || !this.tableConversations) {
            console.error("DynamoDB table names are not properly set");
        } else {
            console.log("DynamoDB table names are set");
        }
    }

    async updateExpiresAtInConversationsAndCels(numberCel, expiresAt) {
        const params = {
            TableName: this.tableConversationsAndCels,
            Key: {
                'cellphone': numberCel
            },
            UpdateExpression: "set expires_at = :e",
            ExpressionAttributeValues: {
                ":e": expiresAt
            }
        };

        try {
            await this.dynamoDb.update(params).promise();
            console.log("expires_at actualizado con éxito para", numberCel);
        } catch (error) {
            console.error("Error al actualizar expires_at:", error);
        }
    }

    async storeNewConversationInConversationsAndCels(numberCel, conversationId, expiresAt) {
        const params = {
            TableName: this.tableConversationsAndCels,
            Item: {
                'cellphone': numberCel,
                'conversation_id': conversationId,
                'expires_at': expiresAt
            }
        };

        try {
            await this.dynamoDb.put(params).promise();
            console.log("Nuevo registro almacenado en Conversations-and-cels para", numberCel);
        } catch (error) {
            console.error("Error al almacenar en Conversations-and-cels:", error);
        }
    }

    async getExpiresAtFromConversations(conversationId) {
        const params = {
            TableName: this.tableConversations,
            Key: {
                'conversation_id': conversationId
            }
        };

        try {
            const result = await this.dynamoDb.get(params).promise();
            return result.Item ? result.Item.expires_at : null;
        } catch (error) {
            console.error("Error al obtener expires_at para el conversationId:", error);
            return null;
        }
    }

    async getClientInfoFromDynamoDB(client, bot) {
        const params = {
            TableName: this.tableServerlessSonia,
            KeyConditionExpression: 'client = :client AND bot = :bot',
            ExpressionAttributeValues: {
                ':client': client,
                ':bot': bot
            }
        };
    
        try {
            const result = await this.dynamoDb.query(params).promise();
            if (result.Items && result.Items.length > 0) {
                return {
                    client: result.Items[0].client,
                    bot: result.Items[0].bot,
                    telefono: result.Items[0].cellphone,
                    valor: result.Items[0].AGENT_CONFIG
                };
            }
            return null;
        } catch (error) {
            console.error("Error querying DynamoDB for client info:", error);
            return null;
        }
    }


    async getConversationIdFromDB(cellphone) {
        const params = {
            TableName: this.tableConversationsAndCels,
            KeyConditionExpression: 'cellphone = :cellphoneValue',
            ExpressionAttributeValues: {
                ':cellphoneValue': cellphone
            }
        };

        try {
            const result = await this.dynamoDb.query(params).promise();
            return result.Items && result.Items.length > 0 ? result.Items[0].conversation_id : null;
        } catch (error) {
            console.error("Error al obtener el conversationId para el number_cel:", error);
            return null;
        }
    }

}

module.exports = DynamoDBService;