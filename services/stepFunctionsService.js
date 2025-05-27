const AWS = require('aws-sdk');

class StepFunctionsService {
    constructor() {
        AWS.config.update({
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });

        this.stepFunctions = new AWS.StepFunctions();
        this.stateMachineArn = process.env.STEP_FUNCTION_ARN;

        if (!this.stateMachineArn) {
            throw new Error('STEP_FUNCTION_ARN no está configurado');
        }

        console.log('StepFunctionsService initialized with ARN:', this.stateMachineArn);
    }

    async startExecution(payload) {
        try {
            console.log('Starting Step Function execution with payload:', JSON.stringify(payload, null, 2));

            const params = {
                stateMachineArn: this.stateMachineArn,
                input: JSON.stringify(payload)
            };

            const execution = await this.stepFunctions.startExecution(params).promise();
            console.log("Step Function execution started:", execution.executionArn);

            const result = await this.waitForExecution(execution.executionArn);
            return this.transformOutput(result);
        } catch (error) {
            console.error("Error executing Step Function:", error);
            return this.handleError(error);
        }
    }

    async waitForExecution(executionArn, maxAttempts = 30, delay = 1000) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const execution = await this.stepFunctions.describeExecution({
                    executionArn: executionArn
                }).promise();

                console.log(`Execution status (attempt ${attempts + 1}):`, execution.status);

                if (execution.status === 'SUCCEEDED') {
                    return JSON.parse(execution.output);
                }

                if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(execution.status)) {
                    throw new Error(`Execution failed with status: ${execution.status}`);
                }

                await new Promise(resolve => setTimeout(resolve, delay));
                attempts++;
            } catch (error) {
                console.error(`Error checking execution status (attempt ${attempts + 1}):`, error);
                throw error;
            }
        }

        throw new Error(`Execution timed out after ${maxAttempts} attempts`);
    }

    transformOutput(output) {
        if (!output) {
            return {
                status: "error",
                message: "No output from Step Function",
                details: { conversation_history: [] }
            };
        }

        // Si la respuesta es exitosa
        if (output.CONVERSATION) {
            return {
                status: "success",
                message: "Step Function executed successfully",
                details: {
                    conversation_id: output.conversation_id,
                    client: output.client,
                    bot: output.bot,
                    cellphone: output.cellphone,
                    conversation_history: output.CONVERSATION.conversation_history || [],
                    current_conversation_stage: output.CONVERSATION.current_conversation_stage
                }
            };
        }

        // Si hay un error o respuesta inesperada
        return {
            status: "error",
            message: output.error || "Unexpected Step Function response format",
            details: {
                error: output.error,
                conversation_history: [],
                originalOutput: output
            }
        };
    }

    handleError(error) {
        return {
            status: "error",
            message: error.message,
            details: {
                errorType: error.code || error.name,
                errorMessage: error.message,
                conversation_history: [],
                timestamp: new Date().toISOString()
            }
        };
    }
}

module.exports = StepFunctionsService;