// worker.js
const { Worker } = require('bullmq');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connection = require('./redis');

function startWorker(jobName, events) {
  const jobHandler = require(`./jobs/${jobName}`);

  new Worker(jobName, async job => {
    const result = await jobHandler(job.data.inputs, events);
    return result;
  }, { connection });
}

module.exports = { startWorker };
