// orchestrator.js
const fs = require('fs');
const IORedis = require('ioredis');
const yaml = require('js-yaml');
const { Queue, QueueEvents, Job } = require('bullmq');
const path = require('path');

const connection = new IORedis({
  host: '127.0.0.1',  // or your Redis host
  port: 6379,         // default Redis port
  password: '',       // add if needed
  db: 4,               // optional, select Redis DB
  maxRetriesPerRequest: null, // <- REQUIRED by BullMQ
  enableReadyCheck: false     // <- Optional, but often used with BullMQ
});

const jobResults = {};

function loadWorkflow(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
}

async function runWorkflow(flow) {
  const jobQueueMap = {};
  const queueEventsMap = {};

  for (const [jobName, jobDef] of Object.entries(flow.jobs)) {
    const queue = new Queue(jobDef.task, { connection });
    const queueEvents = new QueueEvents(jobDef.task, { connection });
    await queueEvents.waitUntilReady(); // ✅ make sure it's ready

    jobQueueMap[jobName] = queue;
    queueEventsMap[jobName] = queueEvents;
  }

  const pendingJobs = new Set(Object.keys(flow.jobs));

  while (pendingJobs.size > 0) {
    for (const jobName of Array.from(pendingJobs)) {
      const jobDef = flow.jobs[jobName];
      const deps = jobDef.dependsOn || [];

      const depsSatisfied = deps.every(d => jobResults[d]);

      if (depsSatisfied) {
        const resolvedInputs = resolveInputs(jobDef.inputs, jobResults);
        const queue = jobQueueMap[jobName];
        const queueEvents = queueEventsMap[jobName];

        const job = await queue.add(jobName, { inputs: resolvedInputs });

        const completed = await job.waitUntilFinished(queueEvents); 
        jobResults[jobName] = completed;

        pendingJobs.delete(jobName);
      }
    }
  }

  return jobResults;
}

function resolveInputs(inputDef, results) {
  if (!inputDef) return {};

  const resolved = {};
  for (const [key, val] of Object.entries(inputDef)) {
    if (typeof val === 'string' && val.startsWith('${')) {
      // Basic templating
      const match = val.match(/\${(.*)}/);
      if (match) {
        const path = match[1].split('.');
        let output = results;
        for (const p of path) {
          output = output[p];
        }
        resolved[key] = output;
      }
    } else {
      resolved[key] = val;
    }
  }
  return resolved;
}

module.exports = { loadWorkflow, runWorkflow };