// index.js
const promptSync = require('prompt-sync')({ sigint: true });
const { startWorker } = require('./worker');
const { loadWorkflow, runWorkflow } = require('./orchestrator');

// Load and start workers
const flow = loadWorkflow('./entrypoints/weavex2.yaml');
const uniqueTasks = new Set(Object.values(flow.jobs).map(j => j.task));
uniqueTasks.forEach((task) => startWorker(task, flow.events));

flow.events.on("start", (data) => {
  console.log('> start', data);
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

let inputs = {};

if (flow.prompts) {
  Object.keys(flow.prompts).forEach((prompt) => {
    inputs[prompt] = promptSync(`${flow.prompts[prompt].label} (${flow.prompts[prompt].default}): `, flow.prompts[prompt].default, { autocomplete: false })
  });
}

// Start orchestrating
runWorkflow(flow, inputs).then(results => {
  process.exit(0);
});
