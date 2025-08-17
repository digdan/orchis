const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (arguments) => {
  return new Promise((resolve, reject) => {
    execFile(`${process.env['FFMPEG_PATH']}/ffmpeg`, arguments, (err, stdout) => {
      if (err) return reject(err);
      resolve(true);
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

  const color = inputs.color || 'black';
  const width = inputs.width;
  const height = inputs.height;
  const direction = inputs.direction || 'out';
  const start = inputs.start;
  const duration = inputs.duration;
  const alpha = inputs.alpha || 1;

    const fileParts = path.parse(inputs.file);
        const newFilename = `${fileParts.dir}/${fileParts.name}-fade${fileParts.ext}`;


    await run([
        '-i', inputs.file,
        '-filter_complex',
        `[0:v]format=rgba[video];color=${color}:s=${width}x${height}:d=2[fadecolor];[fadecolor]fade=t=${direction}:st=${start}:d=${duration}:alpha=${alpha}[fade];[fade][video]overlay=format=auto:shortest=1`,
        '-ca', 'copy', newFileName
    ]);

  return {
    file: newFilename,
  }

}