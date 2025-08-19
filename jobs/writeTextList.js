const fs = require('fs');
const path = require('path');
const MD5 = require('../libs/MD5');


/**
 * 
 * @param {list} inputs 
 * @param {file} events 
 * @returns 
 */
module.exports = async function writeTextList(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    console.log('INPUTS', inputs);

    let text = "";
    inputs.list.forEach(segment => {
        const parts = path.parse(segment);
        text = text + `file '${parts.base}'\n`
    });
    const txtFileName = `${inputs.table}/${MD5(text)}.txt`;
    fs.writeFileSync(txtFileName, text);
    return {
        file: txtFileName
    }
}
