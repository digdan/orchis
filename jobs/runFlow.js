const { loadWorkflow, runWorkflow, resolveStringTemplate } = require('../orchestrator');
const { startWorker } = require('../worker');

/**
 * Runs a workflow with improved async job handling and dependency resolution
 * @param {Object} inputs - Input parameters for the workflow
 * @param {EventEmitter} events - Event emitter for external communication
 * @returns {Promise<Object>} - Workflow results or mapped outputs
 */
module.exports = async function runFlow(inputs, events) {
    try {
        validateInputs(inputs, events);

        const eventEmitter = createEventEmitter(inputs, events);
        const flow = await initializeFlow(inputs.flow);

        await startRequiredWorkers(flow);
        setupEventListeners(flow.events);

        const results = await executeWorkflow(flow, inputs);
        const outputs = processOutputs(flow, results);

        return outputs;
    } catch (error) {
        console.error('Flow execution failed:', error);
        throw new Error(`Flow execution failed: ${error.message}`);
    }
};

/**
 * Validates required input parameters
 */
function validateInputs(inputs, events) {
    if (!inputs) {
        throw new Error('Inputs parameter is required');
    }

    if (!inputs.flow) {
        throw new Error('Flow name is required in inputs');
    }

    if (!events) {
        throw new Error('Events parameter is required');
    }
}

/**
 * Creates a standardized event emitter function
 */
function createEventEmitter(inputs, events) {
    return (topic, message = {}) => {
        const eventData = {
            name: inputs.name,
            task: inputs.task,
            timestamp: new Date().toISOString(),
            ...message
        };

        events.emit(topic, eventData);
    };
}

/**
 * Loads and initializes the workflow
 */
async function initializeFlow(flowName) {
    try {
        const flowPath = `./flows/${flowName}.yaml`;
        const flow = await loadWorkflow(flowPath);

        if (!flow) {
            throw new Error(`Failed to load workflow: ${flowPath}`);
        }

        if (!flow.jobs) {
            throw new Error('Workflow must contain jobs');
        }
        return flow;
    } catch (error) {
        throw new Error(`Workflow initialization failed: ${error.message}`);
    }
}

/**
 * Starts all required workers for the workflow jobs
 */
async function startRequiredWorkers(flow) {
    const uniqueTasks = extractUniqueTasks(flow.jobs);

    // Start workers concurrently for better performance
    const workerPromises = Array.from(uniqueTasks).map(async (task) => {
        try {
            await startWorker(task, flow.events);
        } catch (error) {
            console.error(`Failed to start worker for task ${task}:`, error);
            throw error;
        }
    });

    await Promise.all(workerPromises);
}

/**
 * Extracts unique task types from workflow jobs
 */
function extractUniqueTasks(jobs) {
    const tasks = Object.values(jobs)
        .map(job => job.task)
        .filter(task => task && typeof task === 'string');

    return new Set(tasks);
}

/**
 * Sets up event listeners for workflow monitoring
 */
function setupEventListeners(flowEvents) {
    const eventHandlers = {
        start: (data) => console.log('🚀 Workflow started:', data),
        end: (data) => console.log('✅ Workflow completed:', data),
        newJob: (data) => console.log('📋 New job created:', data),
        completedJob: (data) => console.log('✓ Job completed:', data),
        failedJob: (data) => console.error('❌ Job failed:', data),
        debug: (data) => console.log(`🔍 ${data.name} DEBUG:`, data),
        error: (data) => console.error('⚠️ Workflow error:', data)
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
        flowEvents.on(event, handler);
    });
}

/**
 * Executes the workflow with improved error handling
 */
async function executeWorkflow(flow, inputs) {
    try {
        const results = await runWorkflow(flow, inputs);

        if (!results) {
            return {};
        }

        return results;
    } catch (error) {
        console.error('Workflow execution error:', error);
        throw error;
    }
}

/**
 * Processes and maps workflow outputs
 */
function processOutputs(flow, results) {
    if (!flow.outputs) {
        return results;
    }

    try {
        const mappedOutputs = mapWorkflowOutputs(flow.outputs, results);
        return mappedOutputs;
    } catch (error) {
        console.error('Output mapping failed:', error);
        // Return raw results as fallback
        return results;
    }
}

/**
 * Maps workflow outputs using template resolution
 */
function mapWorkflowOutputs(outputDefinitions, results) {
    const mappedOutputs = {};

    Object.entries(outputDefinitions).forEach(([outputKey, outputValue]) => {
        try {
            if (isTemplateString(outputValue)) {
                // Resolve template strings like ${job1.result}
                mappedOutputs[outputKey] = resolveStringTemplate(outputValue, results);
            } else {
                // Direct value mapping
                mappedOutputs[outputKey] = outputValue;
            }
        } catch (error) {
            console.error(`Failed to map output ${outputKey}:`, error);
            mappedOutputs[outputKey] = null;
        }
    });

    return mappedOutputs;
}

/**
 * Checks if a value is a template string
 */
function isTemplateString(value) {
    return typeof value === 'string' &&
        value.trim().startsWith('${') &&
        value.trim().endsWith('}');
}