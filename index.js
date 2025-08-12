// index.js
const { startWorker } = require('./worker');
const { loadWorkflow, runWorkflow } = require('./orchestrator');

// Load and start workers
const flow = loadWorkflow('./flows/example-flow.yaml');
const uniqueTasks = new Set(Object.values(flow.jobs).map(j => j.task));
uniqueTasks.forEach(startWorker);

// Start orchestrating
runWorkflow(flow).then(results => {
  console.log('Workflow completed:', results);
  process.exit(0);
});
