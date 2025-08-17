const fs = require('fs');
const path = require('path');
module.exports = async function writeList(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }
    let text = "";
    inputs.list.forEach(segment => {
        const parts = path.parse(segment);
        text = text + `file '${parts.base}'\n`
    })
    fs.writeFileSync("./table/list.txt", text);
    return {
        listFile: "./table/list.txt"
    }
}
