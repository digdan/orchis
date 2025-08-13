const IORedis = require('ioredis');
const connection = new IORedis({
    host: '192.168.0.98',  // or your Redis host
    port: 6379,         // default Redis port
    password: '',       // add if needed
    db: 6,               // optional, select Redis DB
    maxRetriesPerRequest: null, // <- REQUIRED by BullMQ
    enableReadyCheck: false     // <- Optional, but often used with BullMQ
});

module.exports = connection;