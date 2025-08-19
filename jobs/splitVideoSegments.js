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

function allFilesExist(files) {
    return files.every(file => {
        try {
            return fs.existsSync(path.resolve(file));
        } catch {
            return false;
        }
    });
}

/**
 * 
 * @param {file, segmentDuration} inputs 
 * @param {*} events 
 * @returns { segmentFiles }
 */
module.exports = async function splitVideoSegments(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }

    const fileParts = path.parse(inputs.file);
    const segmentFiles = [];
    const targetFiles = [];
    for (let i = 1; i <= inputs.segments; i++) {
        targetFiles.push(`${fileParts.dir}/${fileParts.name}-s${i}${fileParts.ext}`);
    }

    if (allFilesExist(targetFiles)) {
        return {
            segmentFiles: targetFiles
        }
    }

    for (const [i, newFilename] of targetFiles) {
        const arguments = [
            '-y',
            '-i', inputs.file,
            '-ss', ((i - 1) * inputs.segmentDuration),
            '-t', inputs.segmentDuration,
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'veryfast',
            newFilename
        ];
        segmentFiles.push(newFilename);
        await run(arguments);
    }
    return {
        segmentFiles
    }
}