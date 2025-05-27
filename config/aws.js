const AWS = require('aws-sdk');
const { AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = require('./environment');

AWS.config.update({
    region: AWS_DEFAULT_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
});

module.exports = AWS;