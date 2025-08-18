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
 * @param { listFile } inputs 
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

    const fileContents = fs.readFileSync(inputs.listFile, 'utf8');
    const filename = `${inputs.table}/il-${MD5(fileContents)}.mp4`

    let arguments = [
        '-framerate', inputs.rate,
        '-i', inputs.listFile,
        '-c:v', 'libx264',
        '-crf', "1",
        '-vf', `scale=${width}x${height}`,
        '-pix_fmt', 'yuv420p',
        filename
    ];

    await run(arguments);
    return {
        file: filename
    }
}