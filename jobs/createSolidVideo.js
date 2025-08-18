const { execFile } = require('child_process');
const fs = require('fs');
const MD5 = require('../libs/MD5')
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
 * @param { color, width, height, duration, rate, table} inputs 
 * @param {*} events 
 * @returns { file }
 */

module.exports = async function createSolidVideo(inputs, events) {
  const send = (topic, message) => {
    events.emit(topic, {
      name: inputs.name,
      job: inputs.job,
      ...message
    });
  }

  const color = inputs.color || 'black';
  const width = inputs.width;
  const height = inputs.height;
  const duration = inputs.duration;
  const rate = inputs.rate || 60;
  const table = inputs.table;

  const blankColorName = MD5(`${color}x${width}x${height}x${duration}x${rate}`);
  const blankColorPath = `${table}/scv-${blankColorName}.mp4`;
  const blankColorArgs = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=color=${color}:size=${width}x${height}:rate=${rate}:duration=${duration}`,
    '-c:v', 'libx264',
    blankColorPath
  ]
  await run(blankColorArgs)

  return {
    file: blankColorPath,
  }

}