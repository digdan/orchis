const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (arguments) => {
    return new Promise((resolve, reject) => {
        execFile('/opt/homebrew/bin/ffmpeg', arguments, (err, stdout) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

module.exports = async function combineVideos(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            task: inputs.task,
            ...message
        });
    }
    let arguments = [
        '-f', 'concat',
        '-safe', '0',
        '-i', inputs.listFile,
        '-c', 'copy',
        './table/combined.mp4'
    ];

    await run(arguments);
    return {
        merged: './table/combined.mp4'
    }
}