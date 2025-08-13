const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (arguments) => {
  return new Promise((resolve, reject) => {
    execFile('/opt/homebrew/bin/ffmpeg', arguments, (err, stdout) => {
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

  // Calculate the points
  const newPoints = inputs.durationTo / inputs.durationFrom;
  const pointSafe = Math.round(newPoints * 100000);
  const fileParts = path.parse(inputs.file);
  const newFile = `${fileParts.dir}/${fileParts.name}-p${pointSafe}${fileParts.ext}`;

  if (!fs.existsSync(newFile)) {
    await run([
      '-i', inputs.file,
      '-filter:v', `setpts=${newPoints}*PTS`, newFile
    ])
  }

  return {
    file: newFile,
    points: newPoints
  }

}