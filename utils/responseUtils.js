const JSON5 = require('json5');

/**
 * Cleans the response of control characters.
 * @param {string} response - The response string to clean.
 * @returns {string} The cleaned response string.
 */
function cleanResponse(response) {
    return response.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

/**
 * Parses a JSON string, handling some common issues.
 * @param {string} jsonString - The JSON string to parse.
 * @returns {Object} The parsed JSON object.
 */
function customJSONParse(jsonString) {
    // Replace the value of startDate with a quoted version
    const fixedJsonString = jsonString.replace(/"startDate"\s*:\s*([\d.E]+)/, '"startDate": "$1"');
    
    try {
        return JSON5.parse(fixedJsonString);
    } catch (error) {
        console.error("Error parsing JSON:", error);
        // If parsing fails, we try a more permissive parsing
        return Function('"use strict";return (' + fixedJsonString + ')')();
    }
}

module.exports = {
    cleanResponse,
    customJSONParse
};