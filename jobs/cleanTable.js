const fs = require('fs');
const path = require('path');

function deleteFilesStartingWith(dirPath, prefix) {
    try {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            if (file.startsWith(prefix)) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isFile()) {
                    fs.unlinkSync(filePath);
                }
            }
        });
    } catch (err) {
        console.error('Error deleting files:', err);
    }
}

module.exports = async function cleanTable(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    deleteFilesStartingWith(inputs.table, inputs.prefix);

    return {}

}