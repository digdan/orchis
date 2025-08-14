// index.js
const promptSync = require('prompt-sync')({ sigint: false });
const fs = require('fs');
const path = require('path');
const { startWorker } = require('./worker');
const {
  loadWorkflow,
  runWorkflow,
  WorkflowError,
  JobExecutionError,
  DependencyError
} = require('./orchestrator');

/**
 * Main application entry point
 */
const main = async () => {
  let flow;

  try {
    console.log('🚀 Starting workflow orchestrator...\n');

    // Load workflow with error handling
    flow = await loadWorkflow('./entrypoints/weavex2.yaml');
    console.log(`✅ Loaded workflow: ${flow.name || 'Unnamed Workflow'}`);

    // Start workers for all
    await startWorkers(flow, './jobs');

    // Set up comprehensive event logging
    setupEventListeners(flow);

    // Collect user inputs if prompts are defined
    const inputs = await collectUserInputs(flow);

    // Execute the workflow
    console.log('\n🎬 Starting workflow execution...\n');
    const results = await runWorkflow(flow, inputs);

    console.log('\n🎉 Workflow completed successfully!');
    console.log('📊 Final Results:');
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);

  } catch (error) {
    await handleError(error, flow);
    process.exit(1);
  }
};

/**
 * Starts workers for all unique tasks in the workflow
 * @param {Object} flow - The workflow definition
 */
const startWorkers = async (flow, jobsDir) => {
  try {
    let uniqueTasks = [];
    const files = fs.readdirSync(jobsDir);
    files.forEach(file => {
      const parts = path.parse(file);
      uniqueTasks.push(parts.name);
    });

    console.log(`🔧 Starting ${uniqueTasks.size} worker(s) for tasks: ${Array.from(uniqueTasks).join(', ')}`);

    const workerPromises = Array.from(uniqueTasks).filter(task => task !== 'runWorkflow').map(async (task) => {
      try {
        await startWorker(task, flow.events);
        console.log(`✅ Worker started for task: ${task}`);
      } catch (error) {
        console.error(`❌ Failed to start worker for task "${task}":`, error.message);
        throw new WorkflowError(`Worker initialization failed for task: ${task}`, {
          task,
          originalError: error.message
        });
      }
    });

    await Promise.all(workerPromises);
    console.log('🎯 All workers started successfully\n');

  } catch (error) {
    throw new WorkflowError('Failed to start workers', {
      originalError: error.message
    });
  }
};

/**
 * Sets up comprehensive event listeners for workflow monitoring
 * @param {Object} flow - The workflow definition with events
 */
const setupEventListeners = (flow) => {
  // Workflow-level events
  flow.events.on('start', (data) => {
    console.log('🏁 Workflow started');
    console.log(`   └─ Inputs: ${Object.keys(data.inputs).length} parameter(s)`);
    console.log(`   └─ Jobs: ${Object.keys(data.flow.jobs).length} job(s)`);
    console.log(`   └─ Started at: ${new Date(data.timestamp).toISOString()}\n`);
  });

  flow.events.on('end', (data) => {
    const duration = formatDuration(data.duration);
    console.log(`\n🏁 Workflow completed in ${duration}`);
    console.log(`   └─ Results: ${Object.keys(data.results).length} result(s)`);
    console.log(`   └─ Ended at: ${new Date(data.timestamp).toISOString()}\n`);
  });

  flow.events.on('error', (data) => {
    const duration = formatDuration(data.duration);
    console.error(`\n💥 Workflow failed after ${duration}`);
    console.error(`   └─ Error: ${data.error.message}`);
    console.error(`   └─ Failed at: ${new Date(data.timestamp).toISOString()}\n`);
  });

  // Job-level events
  flow.events.on('jobStarted', (data) => {
    const deps = data.dependencies.length > 0
      ? ` (waiting for: ${data.dependencies.join(', ')})`
      : '';
    console.log(`🔄 Job "${data.name}" started${deps}`);
  });

  flow.events.on('jobQueued', (data) => {
    console.log(`📤 Job "${data.name}" queued for execution`);
  });

  flow.events.on('jobCompleted', (data) => {
    const duration = formatDuration(data.duration);
    console.log(`✅ Job "${data.name}" completed in ${duration}`);
  });

  flow.events.on('jobFailed', (data) => {
    const duration = formatDuration(data.duration);
    console.error(`❌ Job "${data.name}" failed after ${duration}: ${data.error}`);
  });

  // Legacy event support (maintaining backward compatibility)
  flow.events.on('newJob', (data) => {
    console.log(`📋 Legacy newJob event - Job: ${data.name}`);
  });

  flow.events.on('completedJob', (data) => {
    console.log(`🎯 Legacy completedJob event - Job: ${data.name}`);
  });

  // Debug events
  flow.events.on('debug', (data) => {
    console.log(`🔍 DEBUG [${data.name}]:`, JSON.stringify(data, null, 2));
  });
};

/**
 * Collects user inputs based on workflow prompts
 * @param {Object} flow - The workflow definition
 * @returns {Promise<Object>} User inputs
 */
const collectUserInputs = async (flow) => {
  const inputs = {};

  if (!flow.prompts || Object.keys(flow.prompts).length === 0) {
    console.log('ℹ️  No prompts defined, using empty inputs\n');
    return inputs;
  }

  console.log('📝 Collecting user inputs...\n');

  try {
    for (const [promptKey, promptConfig] of Object.entries(flow.prompts)) {
      if (!promptConfig || typeof promptConfig !== 'object') {
        console.warn(`⚠️  Invalid prompt configuration for "${promptKey}", skipping`);
        continue;
      }

      const label = promptConfig.label || promptKey;
      const defaultValue = promptConfig.default || '';
      const required = promptConfig.required !== false; // Default to required

      let userInput;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const promptText = defaultValue
          ? `${label} (${defaultValue}): `
          : `${label}: `;

        userInput = String(promptSync(promptText, defaultValue, { autocomplete: false }));

        // Validate required inputs
        if (required && (!userInput || userInput.trim() === '')) {
          attempts++;
          console.error(`❌ "${promptKey}" is required. Please provide a value. (Attempt ${attempts}/${maxAttempts})`);

          if (attempts >= maxAttempts) {
            throw new WorkflowError(`Required input "${promptKey}" not provided after ${maxAttempts} attempts`);
          }
          continue;
        }

        break;
      }

      // Apply type conversion if specified
      inputs[promptKey] = convertInputType(userInput, promptConfig.type);
      console.log(`✅ Set ${promptKey}: ${inputs[promptKey]}`);
    }

    console.log(`\n📊 Collected ${Object.keys(inputs).length} input(s)\n`);

  } catch (error) {
    throw new WorkflowError(`Failed to collect user inputs: ${error.message}`, {
      originalError: error.message
    });
  }

  return inputs;
};

/**
 * Converts input string to specified type
 * @param {string} value - Input value
 * @param {string} type - Target type (string, number, boolean, json)
 * @returns {any} Converted value
 */
const convertInputType = (value, type) => {
  if (!type || type === 'string') return value;

  try {
    switch (type.toLowerCase()) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
        return num;

      case 'boolean':
        return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());

      case 'json':
        return JSON.parse(value);

      default:
        console.warn(`⚠️  Unknown input type "${type}", treating as string`);
        return value;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to convert "${value}" to ${type}, using original value`);
    return value;
  }
};

/**
 * Handles different types of errors with appropriate logging and context
 * @param {Error} error - The error to handle
 * @param {Object} flow - The workflow definition (may be undefined if loading failed)
 */
const handleError = async (error, flow) => {
  console.error('\n💥 Application Error:\n');

  // Handle specific error types with detailed information
  if (error instanceof WorkflowError) {
    console.error(`📋 Workflow Error: ${error.message}`);
    if (error.context) {
      console.error('📊 Context:', JSON.stringify(error.context, null, 2));
    }
  } else if (error instanceof JobExecutionError) {
    console.error(`⚙️  Job Execution Error: ${error.message}`);
    console.error(`🔧 Failed Job: ${error.jobName}`);
    if (error.context) {
      console.error('📊 Context:', JSON.stringify(error.context, null, 2));
    }
  } else if (error instanceof DependencyError) {
    console.error(`🔗 Dependency Error: ${error.message}`);
    console.error(`📍 Path: ${error.path}`);
    if (error.context) {
      console.error('📊 Context:', JSON.stringify(error.context, null, 2));
    }
  } else {
    console.error(`🚨 Unexpected Error: ${error.message}`);
    if (error.stack) {
      console.error('📚 Stack Trace:', error.stack);
    }
  }

  // Emit error event if flow is available
  if (flow && flow.events) {
    flow.events.emit('applicationError', { error, timestamp: Date.now() });
  }
};

/**
 * Formats duration in milliseconds to human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

/**
 * Handle graceful shutdown
 */
const setupGracefulShutdown = () => {
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// Set up graceful shutdown handling
setupGracefulShutdown();

// Start the application
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  startWorkers,
  collectUserInputs,
  handleError,
  formatDuration
};