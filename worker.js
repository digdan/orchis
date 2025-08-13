// worker.js
const { Worker } = require('bullmq');
const path = require('path');
const connection = require('./redis');

function startWorker(taskName, events) {
  const jobHandler = require(`./jobs/${taskName}`);

  new Worker(taskName, async job => {
    const result = await jobHandler(job.data.inputs, events);
    return result;
  }, { connection });
}

module.exports = { startWorker };
