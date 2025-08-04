import mustache from 'mustache';
import { exec } from 'node:child_process';

const orchis = (executionDoc, params = {}) => new Promise((resolve, reject) => {
    if (!executionDoc) return reject('No document loaded. Aborting.');

    const previous = new Set();
    const registry = {};
    let openJobs = 0;

    const step = async (depth = 1) => {
        const doc = JSON.parse(mustache.render(JSON.stringify(executionDoc), params));
        const jobs = doc.jobs;

        const readyJobs = Object.entries(jobs).filter(
            ([name, job]) => !previous.has(name) && job.depends_on.every(dep => previous.has(dep))
        );

        for (const [name, job] of readyJobs) {
            previous.add(name);
            openJobs++;

            const command = mustache.render(job.command, registry);
            exec(command, async (error, stdout) => {
                openJobs--;
                if (error) return reject(`Command error in "${name}": ${error.message}`);

                registry[name] = {
                    ...(job.outputs || {}),
                    stdout,
                    depth,
                };

                await step(depth + 1);
                if (openJobs === 0 && previous.size === Object.keys(jobs).length) {
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