// stepFunctionsFactory.js
const AWS = require('aws-sdk');
const axios = require('axios');

class StepFunctionsBase {
    transformOutput(response) {
        try {
            // Handle error responses
            if (response.status === 'FAILED' || response.status === 'error') {
                return {
                    status: "error",
                    message: response.error || "Step Function execution failed",
                    details: {
                        error: response.cause || "Unknown error",
                        conversation_history: [],
                        executionArn: response.executionArn,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            // Parse and transform successful response
            const output = typeof response.output === 'string' ? JSON.parse(response.output) : response.output;

            if (output.statusCode === 200 && output.body) {
                return {
                    status: "success",
                    message: "Step Function executed successfully",
                    details: {
                        conversation_id: output.body.conversation_id,
                        client: output.body.client,
                        bot: output.body.bot,
                        cellphone: output.body.cellphone,
                        conversation_history: output.body.CONVERSATION?.conversation_history || [],
                        current_conversation_stage: output.body.CONVERSATION?.current_conversation_stage,
                        executionArn: response.executionArn,
                        startDate: response.startDate
                    }
                };
            }

            return {
                status: "error",
                message: output.body?.error || "Unexpected response format",
                details: {
                    error: output.body?.error,
                    conversation_history: [],
                    executionArn: response.executionArn,
                    statusCode: output.statusCode,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error("Error transforming output:", error);
            return {
                status: "error",
                message: "Error processing Step Function response",
                details: {
                    error: error.message,
                    originalResponse: response,
                    conversation_history: [],
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    handleError(error) {
        console.error("Step Function error details:", {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            requestId: error.requestId
        });

        return {
            status: "error",
            message: error.message,
            details: {
                errorType: error.code || error.name,
                errorMessage: error.message,
                statusCode: error.statusCode,
                requestId: error.requestId,
                conversation_history: [],
                timestamp: new Date().toISOString()
            }
        };
    }
}

class SDKStepFunctionsService extends StepFunctionsBase {
    constructor() {
        super();
        // Using existing AWS credentials from environment
        AWS.config.update({
            region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });

        this.stepFunctions = new AWS.StepFunctions();
        this.stateMachineArn = process.env.STEP_FUNCTION_ARN;

        if (!this.stateMachineArn) {
            throw new Error('STEP_FUNCTION_ARN is not configured');
        }

        console.log('SDKStepFunctionsService initialized with:', {
            region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
            stateMachineArn: this.stateMachineArn
        });
    }

    async startExecution(payload) {
        try {
            console.log('Starting Step Function execution with payload:', JSON.stringify(payload, null, 2));

            const params = {
                stateMachineArn: this.stateMachineArn,
                input: JSON.stringify(payload)
            };

            const response = await this.stepFunctions.startSyncExecution(params).promise();
            console.log("Step Function execution response:", JSON.stringify(response, null, 2));

            return this.transformOutput(response);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

class APIGatewayStepFunctionsService extends StepFunctionsBase {
    constructor() {
        super();
        this.apiEndpoint = process.env.API_ENDPOINT;
        
        if (!this.apiEndpoint) {
            throw new Error('API_ENDPOINT is not configured');
        }

        console.log('APIGatewayStepFunctionsService initialized with endpoint:', this.apiEndpoint);
    }

    async startExecution(payload) {
        try {
            const response = await axios.post(this.apiEndpoint, payload);
            
            if (response.data.status === "success" && response.data.details) {
                return {
                    status: "success",
                    details: {
                        conversation_id: response.data.details.conversation_id,
                        client: response.data.details.client,
                        bot: response.data.details.bot,
                        cellphone: response.data.details.cellphone,
                        conversation_history: response.data.details.conversation_history || []
                    }
                };
            }
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }
}

class StepFunctionsFactory {
    static createService(type = 'SDK') {
        console.log(`Creating Step Functions service of type: ${type}`);
        switch (type.toUpperCase()) {
            case 'SDK':
                return new SDKStepFunctionsService();
            case 'API':
                return new APIGatewayStepFunctionsService();
            default:
                throw new Error(`Invalid service type: ${type}`);
        }
    }
}

module.exports = { StepFunctionsFactory };