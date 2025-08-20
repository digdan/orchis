const fs = require('fs');
const path = require('path');

/**
 * 
 * @param {url} inputs 
 * @param {*} events 
 * @returns {file, path, mime, size}
 */
module.exports = async function debug(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    send("debug", { inputs });
    return {}
};
