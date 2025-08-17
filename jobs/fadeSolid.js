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

module.exports = async function fadeSolid(inputs, events) {
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
  const direction = inputs.direction || 'out';
  const start = inputs.start;
  const duration = inputs.duration;
  const rate = inputs.rate || 60;
  const alpha = inputs.alpha || 1;

  const fileParts = path.parse(inputs.file);

  // Generate blank color video for future use
  //ffmpeg -f lavfi -i color=color=#00ffcc:size=1920x1080:rate=30:duration=8 -c:v libx264 output.mp4
  const blankColorName = MD5(`${color}x${width}x${height}x${duration}x${rate}`);
  const blankColorPath = `${fileParts.dir}/bc-${blankColorName}${fileParts.ext}`;
  const blankColorArgs = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=color=${color}:size=${width}x${height}:rate=${rate}:duration=${duration}`,
    '-c:v', 'libx264',
    blankColorPath
  ]
  await run(blankColorArgs)

  const combinedHash = MD5(fileParts.name + blankColorName);
  const newFilename = `${fileParts.dir}/fs-${combinedHash}${fileParts.ext}`;
  /*
  ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex \
"[0:v][1:v]xfade=transition=<FADE_TYPE>:duration=<TRANSITION_DURATION_IN_SECONDS>:offset=<OFFSET_RELATIVE_TO_FIRST_STREAM_IN_SECONDS>[outv]; \
[0:a][1:a]acrossfade=d=<TRANSITION_DURATION_IN_SECONDS>[outa]" \
-map "[outv]" -map "[outa]" output.mp4
  */

  const crossFadeArgs = [
    '-y',
    '-i', blankColorPath,
    '-i', inputs.file,
    '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${duration}:offset=${start}[outv]`,
    '-map', '[outv]',
    '-map', '1:a?',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    newFilename
  ]
  await run(crossFadeArgs);

  return {
    file: newFilename,
  }

}