import fs from 'fs';
import yaml from 'js-yaml';
import { Queue, QueueEvents } from 'bullmq';
import 'dotenv/config';
import Orchis from './Orchis.js';

const loadYaml = () => {
    try {
        const doc = yaml.load(fs.readFileSync(process.argv[2], 'utf8'));
        return doc;
    } catch (e) {
        console.error(e);
    }
}

const runJob = ( {queueName, jobName, jobData, orchis} ) => {
  const queue = new Queue(queueName, {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }
  });
  const queueEvents = new QueueEvents(queueName, {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }
  });

  const job = queue.add(jobName, jobData);
  queueEvents.on("completed", ({jobId, returnvalue}) => {
    if (jobId === job.jobId) {
        orchis.complete(jobName, returnvalue);
        orchis.execute();
    }
  });
}

const doc = loadYaml();
console.log(JSON.stringify(doc));
process.exit();

const media_orchis = new Orchis(doc);

media_orchis.on('newJob', ({queueName, jobName, jobData}) => {
    console.log(queueName, jobName, jobData)
    runJob({queueName, jobName, jobData, orchis:media_orchis});
})

media_orchis.execute();