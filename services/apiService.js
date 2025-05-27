const StepFunctionsService = require('./stepFunctionsService');

class ApiService {
    constructor() {
        this.stepFunctionsService = new StepFunctionsService();
    }

    async sendRequest(payload) {
        try {
            // Validate payload before sending
            if (!this.isValidPayload(payload)) {
                throw new Error('Invalid payload structure: Missing required fields');
            }

            // Log the payload for debugging
            console.log("Sending payload to Step Functions:", JSON.stringify(payload, null, 2));

            const response = await this.stepFunctionsService.startExecution(payload);
            console.log("Raw Step Function response:", JSON.stringify(response, null, 2));

            // Transform the response if needed
            const transformedResponse = this.transformStepFunctionResponse(response);

            // Validate the transformed response
            if (!this.isValidResponse(transformedResponse)) {
                throw new Error('Invalid response format from Step Function');
            }

            return transformedResponse;
        } catch (error) {
            console.error("Error in API Service:", error);
            return this.createErrorResponse(error);
        }
    }

    isValidPayload(payload) {
        const requiredFields = ['human_input', 'client', 'bot', 'cellphone'];
        
        if (!payload || typeof payload !== 'object') {
            console.error("Payload is not an object");
            return false;
        }

        const missingFields = requiredFields.filter(field => !(field in payload));
        
        if (missingFields.length > 0) {
            console.error("Missing required fields in payload:", missingFields);
            return false;
        }

        // Validate field types and formats
        if (typeof payload.human_input !== 'string' || payload.human_input.trim() === '') {
            console.error("Invalid or empty human_input");
            return false;
        }

        return true;
    }

    isValidResponse(response) {
        if (!response || typeof response !== 'object') {
            console.error("Response is not an object");
            return false;
        }

        const requiredFields = ['status', 'message', 'details'];
        const missingFields = requiredFields.filter(field => !(field in response));

        if (missingFields.length > 0) {
            console.error("Missing required fields in response:", missingFields);
            return false;
        }

        // Validate details structure for successful responses
        if (response.status === 'success') {
            const requiredDetails = ['conversation_id', 'conversation_history'];
            const missingDetails = requiredDetails.filter(
                field => !response.details || !(field in response.details)
            );

            if (missingDetails.length > 0) {
                console.error("Missing required fields in details:", missingDetails);
                return false;
            }
        }

        return true;
    }

    transformStepFunctionResponse(response) {
        // If it's already an error response, return as is
        if (response.status === 'error') {
            return response;
        }

        try {
            // Handle successful response
            const details = response.details || {};
            
            return {
                status: response.status || 'success',
                message: response.message || 'Request processed successfully',
                details: {
                    conversation_id: details.conversation_id,
                    client: details.client,
                    bot: details.bot,
                    cellphone: details.cellphone,
                    conversation_history: Array.isArray(details.conversation_history) 
                        ? details.conversation_history 
                        : [],
                    current_conversation_stage: details.current_conversation_stage,
                    executionArn: details.executionArn,
                    startDate: details.startDate || new Date().toISOString()
                }
            };
        } catch (error) {
            console.error("Error transforming Step Function response:", error);
            throw error;
        }
    }

    createErrorResponse(error) {
        const errorResponse = {
            status: "error",
            message: error.message || "Error processing request",
            details: {
                error: error.message,
                errorType: error.name || 'UnknownError',
                timestamp: new Date().toISOString()
            }
        };

        // Add additional error information if available
        if (error.executionArn) {
            errorResponse.details.executionArn = error.executionArn;
        }

        if (error.cause) {
            try {
                errorResponse.details.cause = JSON.parse(error.cause);
            } catch {
                errorResponse.details.cause = error.cause;
            }
        }

        if (error.additionalInfo) {
            errorResponse.details.additionalInfo = error.additionalInfo;
        }

        return errorResponse;
    }
}

module.exports = ApiService;