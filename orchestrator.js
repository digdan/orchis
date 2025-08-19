// orchestrator.js
const fs = require('fs').promises;
const yaml = require('js-yaml');
const { Queue, QueueEvents } = require('bullmq');
const { EventEmitter } = require('stream');
const connection = require('./redis');

/**
 * Custom error classes for better error handling
 */
class WorkflowError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'WorkflowError';
    this.context = context;
  }
}

class JobExecutionError extends Error {
  constructor(message, jobName, context = {}) {
    super(message);
    this.name = 'JobExecutionError';
    this.jobName = jobName;
    this.context = context;
  }
}

class DependencyError extends Error {
  constructor(message, path, context = {}) {
    super(message);
    this.name = 'DependencyError';
    this.path = path;
    this.context = context;
  }
}

class NestedWorkflowError extends Error {
  constructor(message, workflowPath, context = {}) {
    super(message);
    this.name = 'NestedWorkflowError';
    this.workflowPath = workflowPath;
    this.context = context;
  }
}

/**
 * Loads and validates a workflow from a YAML file
 * @param {string} filePath - Path to the workflow YAML file
 * @returns {Promise<Object>} The loaded workflow with event emitter
 * @throws {WorkflowError} When file cannot be loaded or parsed
 */
const loadWorkflow = async (filePath) => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const flow = yaml.load(fileContent);

    if (!flow || typeof flow !== 'object') {
      throw new WorkflowError('Invalid workflow format', { filePath });
    }

    if (!flow.jobs || typeof flow.jobs !== 'object') {
      throw new WorkflowError('Workflow must contain jobs definition', { filePath });
    }

    // Validate job definitions
    for (const [jobName, jobDef] of Object.entries(flow.jobs)) {
      if (jobDef.job === 'runWorkflow') {
        // Special validation for runWorkflow jobs
        if (!jobDef.workflowPath) {
          throw new WorkflowError(`Job "runWorkflow" missing required workflowPath field`, { jobName });
        }
      } else if (!jobDef.job) {
        throw new WorkflowError(`Job "${jobName}" missing required job field`, { jobName });
      }
    }

    flow.events = new EventEmitter();
    return flow;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;

    if (error.code === 'ENOENT') {
      throw new WorkflowError(`Workflow file not found: ${filePath}`, { filePath });
    }

    throw new WorkflowError(`Failed to load workflow: ${error.message}`, {
      filePath,
      originalError: error.message
    });
  }
};

/**
 * Executes a workflow with the given inputs
 * @param {Object} flow - The workflow definition
 * @param {Object} inputs - Initial inputs for the workflow
 * @param {number} maxNestingLevel - Maximum allowed nesting depth (default: 5)
 * @returns {Promise<Object>} Results from all jobs
 * @throws {WorkflowError} When workflow execution fails
 */
const runWorkflow = async (flow, inputs = {}, maxNestingLevel = 5) => {
  const startTime = Date.now();
  let queues, queueEvents;

  try {
    const jobResults = { inputs };
    flow.events.emit('start', { flow, inputs, timestamp: startTime });

    // Initialize all queues concurrently (excluding runWorkflow jobs)
    ({ queues, queueEvents } = await initializeQueues(flow));

    // Create job execution promises for true parallelism
    const jobPromises = createJobPromises(flow, jobResults, queues, queueEvents, maxNestingLevel);

    // Execute all jobs with proper error aggregation
    await executeAllJobs(jobPromises, flow);

    const endTime = Date.now();
    flow.events.emit('end', {
      results: jobResults,
      duration: endTime - startTime,
      timestamp: endTime
    });

    if (flow?.outputs) {
      return resolveInputs(flow.outputs, jobResults);
    } else {
      console.log('NO OUTPUTS', flow.name, flow, flow?.outputs);
      return jobResults;
    }
  } catch (error) {
    const endTime = Date.now();
    flow.events.emit('error', {
      error,
      duration: endTime - startTime,
      timestamp: endTime
    });
    throw error;
  } finally {
    // Clean up resources
    await cleanupQueues(queues, queueEvents);
  }
};

/**
 * Initializes all job queues concurrently (excluding runWorkflow jobs)
 * @param {Object} flow - The workflow definition
 * @returns {Promise<{queues: Object, queueEvents: Object}>} Initialized queues and events
 */
const initializeQueues = async (flow) => {
  const queues = {};
  const queueEvents = {};

  const initPromises = Object.entries(flow.jobs)
    .filter(([_, jobDef]) => jobDef.job !== 'runWorkflow') // Skip runWorkflow jobs
    .map(async ([jobName, jobDef]) => {
      try {
        queues[jobName] = new Queue(jobDef.job, { connection });
        queueEvents[jobName] = new QueueEvents(jobDef.job, { connection });

        // Wait for queue to be ready with timeout
        await Promise.race([
          queueEvents[jobName].waitUntilReady(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Queue initialization timeout')), 30000)
          )
        ]);

      } catch (error) {
        throw new WorkflowError(`Failed to initialize queue for job "${jobName}": ${error.message}`, {
          jobName,
          job: jobDef.job,
          originalError: error.message
        });
      }
    });

  await Promise.all(initPromises);
  return { queues, queueEvents };
};

/**
 * Creates job execution promises with proper dependency handling
 */
const createJobPromises = (flow, jobResults, queues, queueEvents, maxNestingLevel) => {
  const jobPromises = {};
  // Create promises for all jobs
  Object.keys(flow.jobs).forEach(jobName => {
      if (flow.jobs[jobName].job === 'runWorkflow') {
        jobPromises[jobName] = executeNestedWorkflow(
          jobName,
          flow,
          jobResults,
          jobPromises,
          maxNestingLevel
        );
      } else {
        jobPromises[jobName] = executeJobWhenReady(
          jobName,
          flow,
          jobResults,
          queues,
          queueEvents,
          jobPromises
        );
      }
  });

  return jobPromises;
};

/**
 * Executes a nested workflow job
 * @param {string} jobName - Name of the runWorkflow job
 * @param {Object} flow - The parent workflow definition
 * @param {Object} jobResults - Shared results object
 * @param {Object} allJobPromises - All job promises for dependency resolution
 * @param {number} maxNestingLevel - Maximum allowed nesting depth
 * @returns {Promise<any>} Nested workflow execution result
 */
const executeNestedWorkflow = async (jobName, flow, jobResults, allJobPromises, maxNestingLevel) => {
  const jobStartTime = Date.now();
  try {
    if (maxNestingLevel <= 0) {
      throw new NestedWorkflowError(
        `Maximum nesting depth exceeded for nested workflow "${jobName}"`,
        jobName,
        { maxNestingLevel }
      );
    }

    const jobDef = flow.jobs[jobName];
    const dependencies = jobDef.dependsOn || [];

    flow.events.emit('jobStarted', {
      name: jobName,
      type: 'nestedWorkflow',
      dependencies,
      workflowPath: jobDef.workflowPath,
      timestamp: jobStartTime
    });

    // Wait for all dependencies
    if (dependencies.length > 0) {
      await waitForDependencies(dependencies, allJobPromises, jobName);
    }

    // Check for iteration
    if (jobDef.iterate) {
      const iterationArray = resolveInputs(jobDef.iterate, jobResults, jobName);
      
      if (!Array.isArray(iterationArray)) {
        throw new NestedWorkflowError(
          `Iterate value must resolve to an array for job "${jobName}"`,
          jobName,
          { iterateValue: iterationArray }
        );
      }

      flow.events.emit('iterationStarted', {
        name: jobName,
        type: 'nestedWorkflow',
        iterationCount: iterationArray.length,
        timestamp: Date.now()
      });

      const iterationResults = [];
      
      for (let i = 0; i < iterationArray.length; i++) {
        const iterationValue = iterationArray[i];
        
        // Update iterate context
        jobResults.iterate = { item: iterationValue, index: i };
        
        flow.events.emit('iterationStep', {
          name: jobName,
          type: 'nestedWorkflow',
          index: i,
          value: iterationValue,
          timestamp: Date.now()
        });

        // Resolve inputs for this iteration
        const resolvedInputs = resolveInputs(jobDef.inputs, jobResults, jobName);

        // Load and execute the nested workflow
        const nestedFlow = await loadWorkflow(jobDef.workflowPath);

        // Forward parent events to nested workflow with prefixing
        const eventForwarder = createEventForwarder(flow.events, jobName, i);
        forwardNestedEvents(nestedFlow.events, eventForwarder);

        // Execute nested workflow with reduced nesting level
        const result = await runWorkflow(nestedFlow, resolvedInputs, maxNestingLevel - 1);
        iterationResults.push(result);
      }

      // Store array of results
      jobResults[jobName] = iterationResults;

      flow.events.emit('iterationCompleted', {
        name: jobName,
        type: 'nestedWorkflow',
        results: iterationResults,
        timestamp: Date.now()
      });

      const jobEndTime = Date.now();
      flow.events.emit('jobCompleted', {
        name: jobName,
        type: 'nestedWorkflow',
        results: iterationResults,
        duration: jobEndTime - jobStartTime,
        timestamp: jobEndTime
      });

      return iterationResults;

    } else {
      // Single execution (existing logic)
      const resolvedInputs = resolveInputs(jobDef.inputs, jobResults, jobName);

      flow.events.emit('nestedWorkflowStarting', {
        name: jobName,
        workflowPath: jobDef.workflowPath,
        inputs: resolvedInputs,
        timestamp: Date.now()
      });

      // Load and execute the nested workflow
      const nestedFlow = await loadWorkflow(jobDef.workflowPath);

      // Forward parent events to nested workflow with prefixing
      const eventForwarder = createEventForwarder(flow.events, jobName);
      forwardNestedEvents(nestedFlow.events, eventForwarder);

      // Execute nested workflow with reduced nesting level
      const result = await runWorkflow(nestedFlow, resolvedInputs, maxNestingLevel - 1);

      // Store result atomically
      jobResults[jobName] = result;

      const jobEndTime = Date.now();
      flow.events.emit('jobCompleted', {
        name: jobName,
        type: 'nestedWorkflow',
        results: result,
        duration: jobEndTime - jobStartTime,
        timestamp: jobEndTime
      });

      return result;
    }

  } catch (error) {
    const jobEndTime = Date.now();
    flow.events.emit('jobFailed', {
      name: jobName,
      type: 'nestedWorkflow',
      error: error.message,
      duration: jobEndTime - jobStartTime,
      timestamp: jobEndTime
    });

    if (error instanceof NestedWorkflowError) throw error;

    throw new NestedWorkflowError(
      `Nested workflow "${jobName}" failed: ${error.message}`,
      jobName,
      { originalError: error.message }
    );
  }
};

/**
 * Creates an event forwarder for nested workflow events
 * @param {EventEmitter} parentEvents - Parent workflow event emitter
 * @param {string} jobName - Name of the nested workflow job
 * @param {number} iterationIndex - Optional iteration index for iterated jobs
 * @returns {Object} Event forwarding functions
 */
const createEventForwarder = (parentEvents, jobName, iterationIndex = null) => {
  const baseData = {
    nestedJobName: jobName,
    iterationIndex,
    timestamp: Date.now()
  };

  return {
    start: (data) => parentEvents.emit('nestedWorkflowEvent', {
      type: 'start',
      ...baseData,
      data
    }),
    end: (data) => parentEvents.emit('nestedWorkflowEvent', {
      type: 'end',
      ...baseData,
      data
    }),
    jobStarted: (data) => parentEvents.emit('nestedWorkflowEvent', {
      type: 'jobStarted',
      ...baseData,
      data
    }),
    jobCompleted: (data) => parentEvents.emit('nestedWorkflowEvent', {
      type: 'jobCompleted',
      ...baseData,
      data
    }),
    jobFailed: (data) => parentEvents.emit('nestedWorkflowEvent', {
      type: 'jobFailed',
      ...baseData,
      data
    }),
    error: (data) => parentEvents.emit('nestedWorkflowEvent', {
      type: 'error',
      ...baseData,
      data
    })
  };
};

/**
 * Forwards nested workflow events to parent workflow
 * @param {EventEmitter} nestedEvents - Nested workflow event emitter
 * @param {Object} forwarder - Event forwarding functions
 */
const forwardNestedEvents = (nestedEvents, forwarder) => {
  nestedEvents.on('start', forwarder.start);
  nestedEvents.on('end', forwarder.end);
  nestedEvents.on('jobStarted', forwarder.jobStarted);
  nestedEvents.on('jobCompleted', forwarder.jobCompleted);
  nestedEvents.on('jobFailed', forwarder.jobFailed);
  nestedEvents.on('error', forwarder.error);
};

/**
 * Executes all jobs and handles errors appropriately
 */
const executeAllJobs = async (jobPromises, flow) => {
  const results = await Promise.allSettled(Object.values(jobPromises));
  const errors = results
    .filter(result => result.status === 'rejected')
    .map(result => result.reason);

  if (errors.length > 0) {
    const errorMessage = `${errors.length} job(s) failed`;
    const aggregatedError = new WorkflowError(errorMessage, { errors });
    throw aggregatedError;
  }
};

/**
 * Executes a single job when its dependencies are ready
 * @param {string} jobName - Name of the job to execute
 * @param {Object} flow - The workflow definition
 * @param {Object} jobResults - Shared results object
 * @param {Object} queues - Job queues
 * @param {Object} queueEvents - Queue event handlers
 * @param {Object} allJobPromises - All job promises for dependency resolution
 * @returns {Promise<any>} Job execution result
 */
const executeJobWhenReady = async (jobName, flow, jobResults, queues, queueEvents, allJobPromises) => {
  const jobStartTime = Date.now();
  try {
    const jobDef = flow.jobs[jobName];
    const dependencies = jobDef.dependsOn || [];

    flow.events.emit('jobStarted', {
      name: jobName,
      dependencies,
      timestamp: jobStartTime
    });

    // Wait for all dependencies with proper error handling
    if (dependencies.length > 0) {
      await waitForDependencies(dependencies, allJobPromises, jobName);
    }

    // Check for iteration
    if (jobDef.iterate) {
      const iterationArray = resolveInputs(jobDef.iterate, jobResults, jobName);
      
      if (!Array.isArray(iterationArray)) {
        throw new JobExecutionError(
          `Iterate value must resolve to an array for job "${jobName}"`,
          jobName,
          { iterateValue: iterationArray }
        );
      }

      flow.events.emit('iterationStarted', {
        name: jobName,
        iterationCount: iterationArray.length,
        timestamp: Date.now()
      });

      const iterationResults = [];
      
      for (let i = 0; i < iterationArray.length; i++) {
        const iterationValue = iterationArray[i];
        
        // Update iterate context
        jobResults.iterate = { item: iterationValue, index: i };
        
        flow.events.emit('iterationStep', {
          name: jobName,
          index: i,
          value: iterationValue,
          timestamp: Date.now()
        });

        // Resolve inputs for this iteration
        const resolvedInputs = {
          ...resolveInputs(jobDef.inputs, jobResults, jobName),
          name: jobName,
          job: jobDef.job
        };

        flow.events.emit('jobQueued', {
          name: jobName,
          iteration: i,
          inputs: resolvedInputs,
          timestamp: Date.now()
        });

        // Execute job with timeout
        const result = await executeJobWithTimeout(
          jobName,
          resolvedInputs,
          queues[jobName],
          queueEvents[jobName],
          jobDef.timeout || 300000 // 5 minute default timeout
        );
        
        iterationResults.push(result);
      }

      // Store array of results
      jobResults[jobName] = iterationResults;

      flow.events.emit('iterationCompleted', {
        name: jobName,
        results: iterationResults,
        timestamp: Date.now()
      });

      const jobEndTime = Date.now();
      flow.events.emit('jobCompleted', {
        name: jobName,
        results: iterationResults,
        duration: jobEndTime - jobStartTime,
        timestamp: jobEndTime
      });

      return iterationResults;

    } else {
      // Single execution (existing logic)
      const resolvedInputs = {
        ...resolveInputs(jobDef.inputs, jobResults, jobName),
        name: jobName,
        job: jobDef.job
      };

      flow.events.emit('jobQueued', {
        name: jobName,
        inputs: resolvedInputs,
        timestamp: Date.now()
      });

      // Execute job with timeout
      const result = await executeJobWithTimeout(
        jobName,
        resolvedInputs,
        queues[jobName],
        queueEvents[jobName],
        jobDef.timeout || 300000 // 5 minute default timeout
      );

      // Store result atomically
      jobResults[jobName] = result;

      const jobEndTime = Date.now();
      flow.events.emit('jobCompleted', {
        name: jobName,
        results: result,
        duration: jobEndTime - jobStartTime,
        timestamp: jobEndTime
      });

      return result;
    }

  } catch (error) {
    const jobEndTime = Date.now();
    flow.events.emit('jobFailed', {
      name: jobName,
      error: error.message,
      duration: jobEndTime - jobStartTime,
      timestamp: jobEndTime
    });

    throw new JobExecutionError(
      `Job "${jobName}" failed: ${error.message}`,
      jobName,
      { originalError: error.message }
    );
  }
};

/**
 * Waits for job dependencies with proper error handling
 */
const waitForDependencies = async (dependencies, allJobPromises, jobName) => {
  try {
    const dependencyPromises = dependencies.map(dep => {
      if (!allJobPromises[dep]) {
        throw new DependencyError(`Unknown dependency "${dep}" for job "${jobName}"`, dep);
      }
      return allJobPromises[dep];
    });

    await Promise.all(dependencyPromises);
  } catch (error) {
    if (error instanceof DependencyError) throw error;
    throw new DependencyError(
      `Dependencies failed for job "${jobName}": ${error.message}`,
      jobName,
      { originalError: error.message }
    );
  }
};

/**
 * Executes a job with timeout protection
 */
const executeJobWithTimeout = async (jobName, inputs, queue, queueEvents, timeoutMs) => {
  const job = await queue.add(jobName, { inputs });
  return Promise.race([
    job.waitUntilFinished(queueEvents),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new JobExecutionError(`Job "${jobName}" timed out after ${timeoutMs}ms`, jobName)),
        timeoutMs
      )
    )
  ]);
};

/**
 * Resolves input templates with enhanced error handling and multi-variable support
 * @param {any} inputDef - Input definition to resolve
 * @param {Object} results - Available results for resolution
 * @param {string} jobName - Current job name for error context
 * @returns {any} Resolved inputs
 */
const resolveInputs = (inputDef, results, jobName) => {
  if (!inputDef) return {};
  const resolveValue = (val, path = '') => {
    try {
      if (typeof val === 'string') {
        return resolveStringTemplate(val, results, jobName, path);
      }

      if (Array.isArray(val)) {
        return val.map((item, index) =>
          resolveValue(item, `${path}[${index}]`)
        );
      }

      if (typeof val === 'object' && val !== null) {
        const resolved = {};
        for (const [key, value] of Object.entries(val)) {
          const currentPath = path ? `${path}.${key}` : key;
          resolved[key] = resolveValue(value, currentPath);
        }
        return resolved;
      }

      return val;
    } catch (error) {
      throw new DependencyError(
        `Failed to resolve input at path "${path}" for job "${jobName}": ${error.message}`,
        path,
        { jobName, originalError: error.message }
      );
    }
  };

  return resolveValue(inputDef);
};

/**
 * Resolves string templates with support for multiple variables and better error messages
 * @param {string} template - Template string to resolve (can contain multiple ${...} expressions)
 * @param {Object} results - Available results
 * @param {string} jobName - Current job name for error context
 * @param {string} inputPath - Path in input structure for error context
 * @returns {any} Resolved value - string if mixed content, original type if single variable
 */
const resolveStringTemplate = (template, results, jobName, inputPath) => {
  // Find all variable references in the template
  const variablePattern = /\${([^}]+)}/g;
  const matches = [...template.matchAll(variablePattern)];

  // If no variables found, return as-is
  if (matches.length === 0) {
    return template;
  }

  // Check if the entire string is a single variable reference
  const singleVariableMatch = template.match(/^\${([^}]+)}$/);
  if (singleVariableMatch && matches.length === 1) {
    // Return the actual resolved value (preserving type)
    return resolveVariablePath(singleVariableMatch[1], results, template, jobName, inputPath);
  }

  // Multiple variables or mixed content - resolve each and build result string
  let resolvedString = template;
  const resolvedValues = new Map();

  // Resolve all unique variable paths first
  for (const match of matches) {
    const variablePath = match[1];
    if (!resolvedValues.has(variablePath)) {
      try {
        const resolvedValue = resolveVariablePath(variablePath, results, `\${${variablePath}}`, jobName, inputPath);
        resolvedValues.set(variablePath, resolvedValue);
      } catch (error) {
        // Re-throw with context about the full template
        throw new DependencyError(
          `Cannot resolve variable "\${${variablePath}}" in template "${template}": ${error.message}`,
          variablePath,
          { jobName, inputPath, template, originalError: error.message }
        );
      }
    }
  }

  // Replace all variable references with their resolved values
  for (const [variablePath, resolvedValue] of resolvedValues) {
    const variableRef = `\${${variablePath}}`;
    // Convert non-string values to strings for template interpolation
    const stringValue = resolvedValue === null || resolvedValue === undefined
      ? ''
      : String(resolvedValue);
    resolvedString = resolvedString.replaceAll(variableRef, stringValue);
  }

  return resolvedString;
};

/**
 * Resolves a single variable path from the results object
 * @param {string} variablePath - Dot-separated path to resolve (e.g., "job1.output.data")
 * @param {Object} results - Available results
 * @param {string} originalTemplate - Original template for error context
 * @param {string} jobName - Current job name for error context
 * @param {string} inputPath - Path in input structure for error context
 * @returns {any} Resolved value
 */
const resolveVariablePath = (variablePath, results, originalTemplate, jobName, inputPath) => {
  const pathSegments = variablePath.split('.');
  let value = results;
  let traversedPath = '';

  for (const segment of pathSegments) {
    traversedPath = traversedPath ? `${traversedPath}.${segment}` : segment;

    if (value === null || value === undefined) {
      throw new DependencyError(
        `Cannot resolve "${originalTemplate}" - value is null/undefined at "${traversedPath}"`,
        traversedPath,
        { jobName, inputPath, template: originalTemplate }
      );
    }

    if (typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, segment)) {
      const availableKeys = typeof value === 'object' && value !== null
        ? Object.keys(value)
        : [];
      throw new DependencyError(
        `Cannot resolve "${originalTemplate}" - missing property "${segment}" at "${traversedPath}"`,
        traversedPath,
        { jobName, inputPath, template: originalTemplate, availableKeys }
      );
    }

    value = value[segment];
  }
  return value;
};

/**
 * Cleans up queue resources
 */
const cleanupQueues = async (queues = {}, queueEvents = {}) => {
  const cleanupPromises = [];

  // Close all queue events
  Object.values(queueEvents).forEach(queueEvent => {
    if (queueEvent && typeof queueEvent.close === 'function') {
      cleanupPromises.push(
        queueEvent.close().catch(err =>
          console.warn('Failed to close queue event:', err.message)
        )
      );
    }
  });

  // Close all queues
  Object.values(queues).forEach(queue => {
    if (queue && typeof queue.close === 'function') {
      cleanupPromises.push(
        queue.close().catch(err =>
          console.warn('Failed to close queue:', err.message)
        )
      );
    }
  });

  await Promise.allSettled(cleanupPromises);
};

module.exports = {
  loadWorkflow,
  runWorkflow,
  resolveStringTemplate,
  // Export error classes for external error handling
  WorkflowError,
  JobExecutionError,
  DependencyError,
  NestedWorkflowError
};