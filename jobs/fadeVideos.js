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
 * @param {type, start, duration, file_a, file_b} inputs 
 * @param {*} events 
 * @returns { file }
 */

/* Fade Types
fade fadeblack	fadewhite	distance
wipeleft	wiperight	wipeup	wipedown
slideleft	slideright	slideup	slidedown
smoothleft	smoothright	smoothup	smoothdown
circlecrop	rectcrop	circleclose	circleopen
horzclose	horzopen	vertclose	vertopen
diagbl	diagbr	diagtl	diagtr
hlslice	hrslice	vuslice	vdslice
dissolve	pixelize	radial	hblur
wipetl	wipetr	wipebl	wipebr
zoomin transition for xfade
fadegrays	squeezev	squeezeh	zoomin
hlwind	hrwind	vuwind	vdwind
coverleft	coverright	coverup	coverdown
revealleft	revealright	revealup	revealdown
*/

module.exports = async function fadeVideos(inputs, events) {
  const send = (topic, message) => {
    events.emit(topic, {
      name: inputs.name,
      job: inputs.job,
      ...message
    });
  }

  const type = inputs.type || 'fade';
  const start = inputs.start;
  const duration = inputs.duration;

  const fileParts = path.parse(inputs.file_a);

  const combinedHash = MD5(inputs.file_a + inputs.file_b);
  const newFilename = `${fileParts.dir}/fs-${combinedHash}${fileParts.ext}`;

  const crossFadeArgs = [
    '-y',
    '-i', inputs.file_b,
    '-i', inputs.file_a,
    '-filter_complex', `[0:v][1:v]xfade=transition=${type}:duration=${duration}:offset=${start}[outv]`,
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