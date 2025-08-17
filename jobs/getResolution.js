const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (arguments) => {
  return new Promise((resolve, reject) => {
    execFile(`${process.env['FFMPEG_PATH']}/ffprobe`, arguments, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

module.exports = async function stretchVideo(inputs, events) {
  const send = (topic, message) => {
    events.emit(topic, {
      name: inputs.name,
      task: inputs.task,
      ...message
    });
  }

  

    const ret = await run([
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0',
        inputs.file
    ]);
    const parts = ret.trim().split(',');
    return {
        width: parts[0],
        height: parts[1]
    }
}