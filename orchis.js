import yaml from 'js-yaml';
import fs from 'fs';
import mustache from 'mustache';
import { exec } from 'node:child_process';
import prompt from 'prompt-sync';

const orchis = (executionDoc, params = {}) => new Promise((resolve, reject) => {
    if (!executionDoc) return reject('No document loaded. Aborting.');

    const envalue = (input) => {
        const subsubDoc = JSON.parse(mustache.render(JSON.stringify(executionDoc), { ...params, ...registry }));
        if (subsubDoc.inputs[input].substr(0, 5) === "eval ") {
            const subFunc = subsubDoc.inputs[input].substr(4);
            const result = new Function(subFunc)();
            return result;
        } else {
            return subsubDoc.inputs[input];
        }
    }

    const started = new Set();
    const completed = new Set();
    const registry = {
        inputs: {},
    };
    let openJobs = 0;

    // Require inputs    
    const subDoc = {...executionDoc};
    if (subDoc?.inputs) {
        //Prompt for any inputs that are missing        
        Object.keys(subDoc.inputs).forEach((input) => {
            subDoc.inputs = JSON.parse(mustache.render(JSON.stringify(executionDoc, registry))).inputs;
            if (!params[input]) {
                if (typeof subDoc["inputs"][input] === 'string') {
                    registry["inputs"][input] = envalue(input);
                } else if (subDoc["inputs"][input]?.prompt) {
                    const answer = prompt()(subDoc.inputs[input].prompt + ": ");
                    registry["inputs"][input] = answer;
                }
            }
        });
    }

    const step = async (depth = 1) => {
        const doc = JSON.parse(mustache.render(JSON.stringify(executionDoc), params));
        const jobs = doc.jobs;

        const readyJobs = Object.entries(jobs).filter(
            ([name, job]) => !started.has(name) && (!job.depends_on || job.depends_on.every(dep => completed.has(dep)))
        );

        for (const [name, job] of readyJobs) {
            started.add(name);
            openJobs++;
            const renderedDoc = JSON.parse(mustache.render(JSON.stringify(executionDoc), { ...params, ...registry}));
            const command = renderedDoc.jobs[name].command;
            console.log(">", command);
            exec(command, async (error, stdout) => {
                openJobs--;
                completed.add(name);
                if (error) return reject(`Command error in "${name}": ${error.message}`);

                registry[name] = {
                    ...(job.outputs || {}),
                    stdout: stdout.split("\n"),
                    depth,
                };

                await step(depth + 1);
                if (openJobs === 0 && completed.size === Object.keys(jobs).length) {
                    resolve(registry);
                }
            });
        }

        // All done with no more jobs to run
        if (readyJobs.length === 0 && openJobs === 0) {
            resolve(registry);
        }
    };

    step();
});

export default orchis;
