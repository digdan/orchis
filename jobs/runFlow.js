const { loadWorkflow, runWorkflow } = require('../orchestrator');
const { startWorker } = require('../worker');
module.exports = async function runFlow(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            task: inputs.task,
            ...message
        });
    }

    // Load and start workers
    const flow = loadWorkflow(`./flows/${inputs.flow}.yaml`);
    const uniqueTasks = new Set(Object.values(flow.jobs).map(j => j.task));
    uniqueTasks.forEach((task) => startWorker(task, flow.events));

    console.log('ffwf', flow, inputs);

    flow.events.on("start", (data) => {
        console.log('|> start', data);
    })
    flow.events.on("end", (data) => {
        console.log('|> end', data);
    })
    flow.events.on("newJob", (data) => {
        console.log('|> new Job', data);
    })
    flow.events.on("completedJob", (data) => {
        console.log('|> completed Job', data);
    })
    flow.events.on("debug", (data) => {
        console.log(`|>> ${data.name} DEBUG:`, data);
    })

    const results = await runWorkflow(flow, inputs);

    // Map outputs    
    if (flow.outputs) {
        let returns = {};
        Object.keys(flow.outputs).forEach(outputKey => {
            const outputValue = flow.outputs[outputKey];
            if (typeof outputValue === 'string' && outputValue.startsWith('${')) {
                const match = outputValue.match(/^\${(.*)}$/);
                if (match) {
                    const path = match[1].split('.');
                    let output = results;
                    for (const p of path) {
                        if (output === null || output === undefined) {
                            throw new Error(`Cannot resolve path "${match[1]}" - intermediate value is null/undefined at "${p}"`);
                        }
                        output = output[p];
                    }
                    returns[outputKey] = output;
                }
            }
        });
        return returns;
    } else {
        return results;
    }
}