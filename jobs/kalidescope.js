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

module.exports = async function fadeVideos(inputs, events) {
  const send = (topic, message) => {
    events.emit(topic, {
      name: inputs.name,
      job: inputs.job,
      ...message
    });
  }

  const newFilename = `${inputs.table}/kv-${MD5(Math.random())}.mp4`;

  if (fs.existsSync(newFilename)) {
    return {
      file: newFilename,
    }
  }


  const args = [
    '-f', 'lavfi',
    '-i', `noise=alls=${inputs.width}x${inputs.height}:allf=t+u`,
    '-filter_complex',
    `[0:v]hflip[h1];[0:v]vflip[v1];[h1]vflip[vh];[v1]hflip[hv];[0:v][h1][v1][vh][hv]xstack=inputs=5:layout=0_0|w0_0|0_h0|w0_h0|w0+h0_h0[v]`,
    '-map', '[v]',
    '-t', inputs.duration,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-y',
    newFilename
  ]
  await run(args);

  return {
    file: newFilename,
  }

}