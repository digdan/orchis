const IORedis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env['REDIS_URL']) {
    process.exit();
}

const connection = new IORedis(process.env['REDIS_URL'], {
    maxRetriesPerRequest: null, // <- REQUIRED by BullMQ
    enableReadyCheck: false,     // <- Optional, but often used with BullMQ
    skipVersionCheck: true
});

module.exports = connection;