const axios = require('axios');
const JSON5 = require('json5');

/**
 * Enhanced response cleaner specifically for API Gateway/Step Functions responses
 * @param {string} response - The response string to clean
 * @returns {string} Cleaned response string
 */
function cleanResponse(response) {
    if (typeof response !== 'string') {
        return JSON.stringify(response);
    }

    // Remove whitespace and newlines
    let cleaned = response.trim()
        .replace(/\r\n/g, '')
        .replace(/\n/g, '')
        .replace(/\s+/g, ' ');

    // Fix specific JSON structure issues from your API Gateway
    cleaned = cleaned
        .replace(/"\s*,\s*}/g, '"}')
        .replace(/,\s*}/g, '}')
        .replace(/{\s*"details"\s*:\s*\s*}/g, '{"details": {}}')
        .replace(/{\s*"details"\s*:\s*\n\s*}/g, '{"details": {}}');

    console.log("Cleaned response:", cleaned);
    return cleaned;
}

/**
 * Parse JSON with specific handling for Step Functions error responses
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object} Parsed JSON object
 */
function customJSONParse(jsonString) {
    // First, try to clean the response
    const cleaned = cleanResponse(jsonString);
    console.log("Attempting to parse cleaned response:", cleaned);

    try {
        return JSON.parse(cleaned);
    } catch (firstError) {
        console.log("First parsing attempt failed:", firstError.message);
        
        try {
            // If it's an error response with empty details, construct a valid JSON
            if (cleaned.includes('"status": "error"')) {
                const errorResponse = {
                    status: "error",
                    message: "An error occurred in the Step Function execution",
                    details: {
                        error: "Step Function execution error",
                        timestamp: new Date().toISOString()
                    }
                };
                return errorResponse;
            }

            // If all else fails, try JSON5
            return JSON5.parse(cleaned);
        } catch (secondError) {
            console.log("Second parsing attempt failed:", secondError.message);
            return createErrorResponse("JSON parsing failed", cleaned);
        }
    }
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {string} originalData - Original problematic data
 * @returns {Object} Error response object
 */
function createErrorResponse(message, originalData) {
    return {
        status: "error",
        message: message || "An unexpected error occurred",
        details: {
            error: message,
            originalData: typeof originalData === 'string' ? originalData.substring(0, 200) + '...' : null,
            timestamp: new Date().toISOString(),
            conversation_history: [],  // Ensure this is always present
            current_conversation_stage: null
        }
    };
}

/**
 * Enhanced API response handler class
 */
class RobustAPIResponseHandler {
    constructor(apiEndpoint) {
        if (!apiEndpoint) {
            throw new Error('API endpoint is required');
        }
        this.apiEndpoint = apiEndpoint;
    }

    async fetchAndParseResponse(payload) {
        try {
            console.log("Sending request to:", this.apiEndpoint);
            console.log("With payload:", JSON.stringify(payload, null, 2));

            const response = await axios.post(this.apiEndpoint, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            console.log("Raw response received:", JSON.stringify(response.data, null, 2));
            
            // Handle string responses
            if (typeof response.data === 'string') {
                return this.parseResponse(response.data);
            }

            // Handle direct JSON responses
            return this.validateResponse(response.data);

        } catch (error) {
            console.error("API communication error:", error);
            
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.message || error.message;
                return createErrorResponse(
                    `API request failed: ${errorMessage}`,
                    error.response?.data
                );
            }

            return createErrorResponse(
                "API communication failed",
                error.message
            );
        }
    }

    parseResponse(data) {
        const parsedData = customJSONParse(data);
        return this.validateResponse(parsedData);
    }

    validateResponse(data) {
        // Acepta respuestas exitosas con detalles básicos
        if (data.status === "success" && 
            data.details && 
            data.details.conversation_history) {
            return {
                status: "success",
                message: data.message,
                details: data.details
            };
        }
    
        // Si no cumple los criterios, retorna error
        return createErrorResponse(
            "Invalid response structure",
            JSON.stringify(data)
        );
    }
}

module.exports = {
    cleanResponse,
    customJSONParse,
    RobustAPIResponseHandler,
    createErrorResponse
};