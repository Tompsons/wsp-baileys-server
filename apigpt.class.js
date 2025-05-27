const { CoreClass } = require("@bot-whatsapp/bot");
const MessageHandler = require('./handlers/messageHandler');
const DynamoDBService = require('./services/dynamoDBService');
const PostgresService = require('./services/postgresService');
const ApiService = require('./services/apiService');
const { API_ENDPOINT } = require('./config/environment');
const RobustAPIResponseHandler = require('./utils/robustApiResponseHandler');

class APIChatGPTClass extends CoreClass {
    constructor(_database, _provider) {
        super(null, _database, _provider);
        this.apiHandler = new RobustAPIResponseHandler(API_ENDPOINT);
        this.dynamoDBService = new DynamoDBService();
        this.postgresService = new PostgresService();
        this.apiService = new ApiService();
        
        this.inactivityTimer = {};
        this.endSessionTimers = {};
        this.userTimers = {};

        // Create MessageHandler after other properties are initialized
        this.messageHandler = new MessageHandler(
            this.sendFlowSimple.bind(this),
            this.startUserTimer.bind(this),
            this.sendMessage.bind(this),
            this.dynamoDBService,
            this.postgresService
        );

        this.initializeServices();
    }

    async initializeServices() {
        const dynamoDBSuccess = await this.dynamoDBService.testConnection();
        if (dynamoDBSuccess) {
            console.log("DynamoDB está correctamente configurado y accesible.");
            
            // Load client configuration
            this.clientConfig = await this.dynamoDBService.getClientInfoFromDynamoDB(
                process.env.CLIENT_ID,
                process.env.BOT_ID
            );
        } else {
            console.error("Hay un problema con la configuración de DynamoDB.");
        }

        await this.postgresService.testConnection();
        this.checkDynamoDBConfiguration();
    }

    handleMsg = async (ctx) => {
        return this.messageHandler.handleMsg(ctx);
    }

    sendMessage = (phoneNumber, message) => {
        const messageToSend = {
            answer: message
        };
    
        this.sendFlowSimple([messageToSend], phoneNumber)
            .then(() => console.log(`Message sent to ${phoneNumber}`))
            .catch((error) => console.error(`Failed to send message to ${phoneNumber}`, error));
    }

    startUserTimer = (phoneNumber) => {
        if (this.userTimers[phoneNumber]) {
            clearTimeout(this.userTimers[phoneNumber].inactivityTimer);
            clearTimeout(this.userTimers[phoneNumber].endSessionTimer);
        }

        const inactivityTimer = setTimeout(() => {
            const inactivityMessage = this.clientConfig?.valor?.INACTIVITY_MESSAGE_WARNING || 
                "Parece que has estado inactivo por un tiempo. ¿Necesitas más ayuda?";
            this.sendMessage(phoneNumber, inactivityMessage);
            
            const endSessionTimer = setTimeout(() => {
                const sessionEndMessage = this.clientConfig?.valor?.SESSION_MESSAGE_END || 
                    "Tu sesión ha finalizado por inactividad. Si necesitas más ayuda, no dudes en escribirnos de nuevo.";
                this.sendMessage(phoneNumber, sessionEndMessage);
                delete this.userTimers[phoneNumber];
            }, 15 * 60 * 1000);

            this.userTimers[phoneNumber].endSessionTimer = endSessionTimer;
        }, 10 * 60 * 1000);

        this.userTimers[phoneNumber] = { inactivityTimer, endSessionTimer: null };
    }

    async sendApiRequest(payload) {
        return this.apiService.sendRequest(payload);
    }

    checkDynamoDBConfiguration() {
        this.dynamoDBService.checkConfiguration();
    }
}

module.exports = APIChatGPTClass;