const axios = require('axios');

class RobustAPIResponseHandler {
    constructor(apiEndpoint) {
        this.apiEndpoint = apiEndpoint;
    }

    async fetchAndParseResponse(payload) {
        try {
            const response = await axios.post(this.apiEndpoint, payload);
            return this.parseResponse(response.data);
        } catch (error) {
            console.error("Error al comunicarse con la API:", error);
            throw new Error("Fallo en la comunicación con la API");
        }
    }

    parseResponse(data) {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (error) {
                console.error("Error parsing JSON string:", error);
                return this.fallbackParsing(data);
            }
        } else if (typeof data === 'object' && data !== null) {
            return data;
        } else {
            throw new Error("Formato de respuesta no reconocido");
        }
    }

    fallbackParsing(data) {
        // Intenta limpiar y parsear la respuesta
        const cleanedData = data.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        try {
            return JSON.parse(cleanedData);
        } catch (error) {
            console.error("Error en fallback parsing:", error);
            
            // Si aún falla, intenta extraer la información relevante usando expresiones regulares
            const conversationIdMatch = cleanedData.match(/"conversation_id"\s*:\s*"([^"]+)"/);
            const conversationHistoryMatch = cleanedData.match(/"conversation_history"\s*:\s*(\[[^\]]+\])/);
            
            if (conversationIdMatch && conversationHistoryMatch) {
                return {
                    details: {
                        conversation_id: conversationIdMatch[1],
                        conversation_history: JSON.parse(conversationHistoryMatch[1].replace(/\\"/g, '"'))
                    }
                };
            } else {
                throw new Error("No se pudo extraer la información necesaria de la respuesta");
            }
        }
    }

    validateParsedData(data) {
        if (!data || !data.details || !data.details.conversation_id || !Array.isArray(data.details.conversation_history)) {
            throw new Error("La estructura de datos parseada no es válida");
        }
        return data;
    }
}

module.exports = RobustAPIResponseHandler;