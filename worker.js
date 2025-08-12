// worker.js
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');

const connection = new IORedis({
  host: '127.0.0.1',  // or your Redis host
  port: 6379,         // default Redis port
  password: '',       // add if needed
  db: 4,               // optional, select Redis DB
  maxRetriesPerRequest: null, // <- REQUIRED by BullMQ
  enableReadyCheck: false     // <- Optional, but often used with BullMQ
});

function startWorker(taskName) {
  const jobHandler = require(`./jobs/${taskName}`);

  new Worker(taskName, async job => {
    const result = await jobHandler(job.data.inputs);
    return result;
  }, { connection });
}

module.exports = { startWorker };
