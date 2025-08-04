import yaml from 'js-yaml';
import fs from 'fs';
import orchis from './orchis.js';

const loadYaml = () => {
    try {
        const doc = yaml.load(fs.readFileSync(process.argv[2], 'utf8'));
        return doc;
    } catch (e) {
        console.error(e);
    }
}

const doc = loadYaml();

const results = await orchis(doc);
console.log('final results', results);