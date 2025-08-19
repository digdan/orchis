const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const MD5 = require('../libs/MD5')

const run = (arguments) => {
    return new Promise((resolve, reject) => {
        execFile(`${process.env['FFMPEG_PATH']}ffmpeg`, arguments, (err, stdout) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

/**
 * 
 * @param { file, table, loops } inputs 
 * @param {*} events 
 * @returns { file }
 */
module.exports = async function imageListVideo(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    const filename = `${inputs.table}/lo-${MD5(fileContents)}-${inputs.loops}.mp4`

    if (fs.existsSync(filename)) {
        return {
            file: filename
        }
    }
    let arguments = [
        '-y',
        '-stream_loop', inputs.loops,
        '-i', inputs.file,
        '-c', 'copy',
        filename
    ];

    await run(arguments);
    return {
        file: filename
    }
}