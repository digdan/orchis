const { execFile } = require('child_process');

const getDuration = async (filePath) => {
    return new Promise((resolve, reject) => {
        execFile('/opt/homebrew/bin/ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ], (err, stdout) => {
            if (err) return reject(err);
            resolve(parseFloat(stdout));
        });
    });
}


module.exports = async function videoDuration(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            task: inputs.task,
            ...message
        });
    }
    // Get duration of video
    const duration = await getDuration(inputs.file);
    return {
        file: inputs.file,
        duration,
        duration_ms: (duration * 1000)
    }
}