import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';


const loadYaml = (ydoc) => {
    try {
        const doc = yaml.load(fs.readFileSync(ydoc, 'utf8'));
        return doc;
    } catch (e) {
        console.error(e);
    }
}

const jobsDir = path.join(process.cwd(), 'jobDefinitions');

function getYamlFiles(dir) {
  const files = fs.readdirSync(dir);
  return files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
}

const yamlFiles = getYamlFiles(jobsDir);
yamlFiles.forEach( (yamlFile) => {
    const doc = loadYaml(`${jobsDir}/${yamlFile}`);
    console.log(chalk.magentaBright.bold(doc.job_id),'-', chalk.whiteBright(doc.description));
    console.log("  ", chalk.blue.bold('inputs'))
    Object.keys(doc.inputs).forEach( inputName => {
        console.log("    ", chalk.blue(inputName), '-', chalk.green(doc['inputs'][inputName]['type']))
    });
    console.log("  ", chalk.blue.bold('outputs'))
    Object.keys(doc.outputs).forEach( outputName => {
        console.log("    ", chalk.blue(outputName), '-', chalk.green(doc['outputs'][outputName]['type']))
    });
    console.log('');
});

