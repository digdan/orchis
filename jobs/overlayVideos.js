const { execFile } = require('child_process');
const fs = require('fs');
const MD5 = require('../libs/MD5')
const { v4 } = require('uuid');
const path = require('path');

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
 * @param {top, left, alpha, file_a, file_b} inputs 
 * @param {*} events 
 * @returns { file }
 */

module.exports = async function overlayVideos(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    const top = inputs.top || "0";
    const left = inputs.left || "0";
    const alpha = inputs.alpha || "1";
    const start = (Math.floor(inputs.start * 1000) / 1000) || "0";
    const end = (Math.floor(inputs.end * 1000) / 1000) || "1";

    const fileParts = path.parse(inputs.file_a);

    const combinedHash = MD5(v4());
    const newFilename = `${fileParts.dir}/ov-${combinedHash}${fileParts.ext}`;
    const overlayArgs = [
        '-y',
        '-i', inputs.file_b,
        '-i', inputs.file_a,
        '-filter_complex', "[1:v]format=rgba,colorchannelmixer=aa=" + alpha + "[ov];[0:v][ov]overlay=x=" + top + ":y=" + left + ":enable='between(t," + start + "," + end + ")'[outv]",
        '-map', '[outv]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-c:a', 'copy',
        newFilename
    ]
    await run(overlayArgs);

    return {
        file: newFilename,
    }

}