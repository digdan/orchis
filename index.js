// index.js
const { startWorker } = require('./worker');
const { loadWorkflow, runWorkflow } = require('./orchestrator');

// Load and start workers
const flow = loadWorkflow('./flows/weave1.yaml');
const uniqueTasks = new Set(Object.values(flow.jobs).map(j => j.task));
console.log('ut', uniqueTasks)
uniqueTasks.forEach((task) => startWorker(task, flow.events));

flow.events.on("start", () => {
  console.log('> start');
})
flow.events.on("end", (data) => {
  console.log('> end', data);
})
flow.events.on("newJob", (data) => {
  console.log('> new Job', data);
})
flow.events.on("completedJob", (data) => {
  console.log('> completed Job', data);
})
flow.events.on("debug", (data) => {
  console.log(`>> ${data.name} DEBUG:`, data);
})

// Start orchestrating
runWorkflow(flow).then(results => {
  process.exit(0);
});
