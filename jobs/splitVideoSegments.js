const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (arguments) => {
    return new Promise((resolve, reject) => {
        execFile(`${process.env['FFMPEG_PATH']}ffmpeg`, arguments, (err, stdout) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

module.exports = async function splitVideoSegments(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    const fileParts = path.parse(inputs.file);
    let segmentList = [];

    for (let i = 1; i <= inputs.segments; i++) {
        const newFilename = `${fileParts.dir}/${fileParts.name}-s${i}${fileParts.ext}`;
        const arguments = [
            '-i', inputs.file,
            '-ss', ((i - 1) * inputs.segmentDuration),
            '-t', inputs.segmentDuration,
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'veryfast',
            newFilename
        ];
        segmentList.push(newFilename);
        await run(arguments);
    }
    return {
        segmentList
    }
}