const { execFile } = require('child_process');

const getDuration = async (filePath) => {
    return new Promise((resolve, reject) => {
        execFile(`${process.env['FFMPEG_PATH']}ffprobe`, [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,duration',
            '-of', 'csv=p=0:s=,',
            filePath
        ], (err, stdout) => {
            if (err) return reject(err);
            resolve(stdout);
        });
    });
}

module.exports = async function getVideoInfo(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }
    // Get duration of video
    const csvData = await getDuration(inputs.file);
    const dataParts = csvData.split(",");
    return {
        file: inputs.file,
        duration: dataParts[2],
        duration_ms: (dataParts[0] * 1000),
        width: dataParts[0],
        height: dataParts[1]
    }
}