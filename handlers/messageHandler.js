const { StepFunctionsFactory } = require('../services/stepFunctionsFactory');

class MessageHandler {
    constructor(sendFlowSimple, startUserTimer, sendMessage, dynamoDBService, postgresService, communicationType = 'SDK') {
        this.sendFlowSimple = sendFlowSimple;
        this.startUserTimer = startUserTimer;
        this.sendMessage = sendMessage;
        this.dynamoDBService = dynamoDBService;
        this.postgresService = postgresService;
        
        console.log('Environment Variables Check:');
        console.log('STEP_FUNCTION_ARN:', process.env.STEP_FUNCTION_ARN);
        console.log('API_ENDPOINT:', process.env.API_ENDPOINT);
        console.log('AWS_REGION:', process.env.AWS_REGION);
        console.log('CLIENT_ID:', process.env.CLIENT_ID);
        console.log('BOT_ID:', process.env.BOT_ID);
        
        console.log(`\n=== Using ${process.env.STEP_FUNCTIONS_COMMUNICATION_TYPE || 'SDK'} communication type ===\n`);
        this.stepFunctionsService = StepFunctionsFactory.createService(
            process.env.STEP_FUNCTIONS_COMMUNICATION_TYPE || 'SDK'
        );
    }

    async handleMsg(ctx) {
        const { from, body, pushName } = ctx;
        console.log("Mensaje recibido de:", from);
        this.startUserTimer(from);

        if (!body || body.trim() === "") {
            console.log(`Mensaje vacío recibido de ${from}. Ignorando.`);
            return;
        }

        if (await this.handleMediaEvent(body, from)) {
            return;
        }

        try {
            const clientInfo = await this.dynamoDBService.getClientInfoFromDynamoDB(
                process.env.CLIENT_ID, 
                process.env.BOT_ID
            );

            console.log("Información del cliente:", clientInfo);

            const existingConversationId = await this.dynamoDBService.getConversationIdFromDB(from);
            
            const payload = {
                human_input: body,
                client: clientInfo?.client || process.env.CLIENT_ID,
                bot: clientInfo?.bot || process.env.BOT_ID,
                cellphone: from,
                conversation_id: existingConversationId || undefined
            };

            console.log("Iniciando ejecución con payload:", payload);
            const response = await this.stepFunctionsService.startExecution(payload);
            console.log("Respuesta del servicio:", response);

            if (response.status === "error") {
                console.error("Error en el servicio:", response.message);
                return;
            }

            await this.handleStepFunctionResponse(response, from, pushName, existingConversationId);

        } catch (error) {
            console.error("Error processing message:", error);
        }
    }

    async handleMediaEvent(body, from) {
        const mediaEvents = {
            '_event_media_': "Lamentablemente, no puedo procesar imágenes o videos.",
            '_event_voice_': "Lamentablemente, no puedo procesar audios.",
            '_event_document_': "Lamentablemente, no puedo procesar documentos."
        };

        for (const [event, message] of Object.entries(mediaEvents)) {
            if (body.startsWith(event)) {
                console.log(`Mensaje de tipo ${event} detectado`);
                this.sendMessage(from, message);
                return true;
            }
        }
        return false;
    }

    async handleStepFunctionResponse(response, from, pushName, existingConversationId) {
        const { details } = response;
        
        if (!details || !details.conversation_id) {
            throw new Error("Invalid response structure");
        }

        const expiresAt = await this.dynamoDBService.getExpiresAtFromConversations(details.conversation_id);

        if (!existingConversationId) {
            await this.dynamoDBService.storeNewConversationInConversationsAndCels(
                from, 
                details.conversation_id, 
                expiresAt
            );
        } else {
            await this.dynamoDBService.updateExpiresAtInConversationsAndCels(from, expiresAt);
        }

        const conversationHistory = details.conversation_history || [];
        if (conversationHistory.length === 0) {
            throw new Error("No conversation history in response");
        }

        const lastMessage = conversationHistory[conversationHistory.length - 1];
        const filteredMessage = lastMessage.replace(/<END_OF_TURN>/g, '').trim();

        const parseMessage = {
            conversationId: details.conversation_id,
            id: details.client,
            text: filteredMessage,
            answer: filteredMessage
        };

        this.sendFlowSimple([parseMessage], from);
    }
}

module.exports = MessageHandler;