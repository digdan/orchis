// orchestrator.js
const fs = require('fs');
const yaml = require('js-yaml');
const { Queue, QueueEvents, Job } = require('bullmq');
const path = require('path');
const { EventEmitter } = require('stream');
const connection = require('./redis');

const jobResults = {};

function loadWorkflow(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const returnFlow = yaml.load(raw);
  returnFlow.events = new EventEmitter();
  return returnFlow;
}

async function runWorkflow(flow) {
  const jobQueueMap = {};
  const queueEventsMap = {};

  flow.events.emit('start');

  // Initialize queues and queue events
  for (const [jobName, jobDef] of Object.entries(flow.jobs)) {
    const queue = new Queue(jobDef.task, { connection });
    const queueEvents = new QueueEvents(jobDef.task, { connection });
    await queueEvents.waitUntilReady(); // ✅ make sure it's ready
    jobQueueMap[jobName] = queue;
    queueEventsMap[jobName] = queueEvents;
  }

  // Create job execution promises
  const jobPromises = {};
  const pendingJobs = new Set(Object.keys(flow.jobs));

  // Function to execute a single job
  async function executeJob(jobName) {
    const jobDef = flow.jobs[jobName];
    const deps = jobDef.dependsOn || [];

    // Wait for all dependencies to complete and ensure their results are available
    if (deps.length > 0) {
      await Promise.all(deps.map(dep => jobPromises[dep]));
    }

    // Resolve inputs after dependencies are complete and results are stored    
    const resolvedInputs = resolveInputs(jobDef.inputs, jobResults);
    resolvedInputs['name'] = jobName;
    resolvedInputs['task'] = flow.jobs[jobName].taik;
    const queue = jobQueueMap[jobName];
    const queueEvents = queueEventsMap[jobName];

    flow.events.emit('newJob', {
      name: jobName
    })

    const job = await queue.add(jobName, { inputs: resolvedInputs });
    const completed = await job.waitUntilFinished(queueEvents);

    flow.events.emit('completedJob', {
      name: jobName,
      results: completed
    });
    // Store result immediately after completion
    jobResults[jobName] = completed;
    return completed;
  }

  // Create promises for all jobs
  for (const jobName of Object.keys(flow.jobs)) {
    jobPromises[jobName] = executeJob(jobName);
  }

  // Wait for all jobs to complete
  await Promise.all(Object.values(jobPromises));

  flow.events.emit('end', jobResults);
  return jobResults;
}

function resolveInputs(inputDef, results) {
  if (inputDef === null || inputDef === undefined) return [];

  function resolveValue(val) {
    if (typeof val === 'string' && val.startsWith('${')) {
      const match = val.match(/^\${(.*)}$/);
      if (match) {
        const path = match[1].split('.');
        let output = results;
        for (const p of path) {
          if (output === null || output === undefined) {
            throw new Error(`Cannot resolve path "${match[1]}" - intermediate value is null/undefined at "${p}"`);
          }
          output = output[p];
        }
        return output;
      }
    } else if (Array.isArray(val)) {
      return val.map(item => resolveValue(item));
    } else if (typeof val === 'object' && val !== null) {
      const resolvedObj = {};
      for (const [k, v] of Object.entries(val)) {
        resolvedObj[k] = resolveValue(v);
      }
      return resolvedObj;
    }
    return val;
  }

  return resolveValue(inputDef);
}


module.exports = { loadWorkflow, runWorkflow };