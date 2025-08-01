import mustache from 'mustache';

export default class Orchis {
    constructor(originalDoc) {
        this.registry = {};
        this.previous = [];
        this.sequence = 1;
        this.originalDoc = originalDoc;
    }

    execute() {
        if (!this.originalDoc) {
            console.error('No document loaded. Aborting.');
            return;
        }
        return this._step(this.originalDoc);
    }

    executeJob(jobName, data) {
            console.log(this.sequence, 'executing job', jobName, data);
    }

    _step(doc) {
        const nextJobs = Object.keys(doc.jobs).filter((jobName) => {
            if (this.previous.includes(jobName)) { // Job already completed
                return false;
            }
            return doc.jobs[jobName].depends_on.every(dep => this.previous.includes(dep));
        });

        nextJobs.forEach((newJobName) => {
            const command = mustache.render(doc.jobs[newJobName].command, this.registry);
            this.executeJob(newJobName, command);
        });
        return nextJobs;
    }

    outputs(jobNames) {
        let outputs = {};
        jobNames.forEach( (jobName) => {
            if (this.originalDoc.jobs[jobName] && this.originalDoc.jobs[jobName].outputs) {
                outputs[jobName] = {};
                Object.entries(this.originalDoc.jobs[jobName].outputs).forEach(([outputName, value]) => {
                    outputs[jobName][outputName] = mustache.render(value, this.registry);
                });
            }
        });
        return outputs;
    }

    completed(jobNames, outputs) {
        const completedJobs = Array.isArray(jobNames) ? jobNames : [jobNames];
        this.previous = this.previous.concat(completedJobs);
        completedJobs.forEach( (completedJob) => {
            if (outputs[completedJob]) {
                Object.entries(outputs[completedJob]).forEach(([outputName, value]) => {
                    if (!this.registry[completedJob]) {
                        this.registry[completedJob] = {};
                    }
                    this.registry[completedJob][outputName] = value;
                });

            }
        })
        this.sequence++;
    }
}