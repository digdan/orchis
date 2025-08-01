import yaml from 'js-yaml';
import fs from 'fs';
import Orchis from './Orchis.js';

const loadYaml = () => {
    try {
        const doc = yaml.load(fs.readFileSync(process.argv[2], 'utf8'));
        return doc;
    } catch (e) {
        console.error(e);
    }
}

const doc = loadYaml();

const media_orchis = new Orchis(doc);
let nextJobs = [];
while (nextJobs = media_orchis.execute()) {
        if (nextJobs.length) {
            nextJobs = media_orchis.completed(nextJobs, media_orchis.outputs(nextJobs));
        } else {
            break;
        }
}