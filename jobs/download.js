const fs = require('fs');
const path = require('path');
var mime = require('mime-types');
const MD5 = require('../libs/MD5');

async function downloadWithProgress(url, outputPath, onProgress) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  let downloadedBytes = 0;

  const fileStream = fs.createWriteStream(outputPath);
  const reader = response.body.getReader();

  let lastEmittedProgress = 0;
  const progressTimer = setInterval(() => {
    if (totalBytes > 0) {
      const percent = ((downloadedBytes / totalBytes) * 100);
      if (percent !== lastEmittedProgress) {
        lastEmittedProgress = percent;
        onProgress(Number(percent.toFixed(2)));
      }
    }
  }, 2000);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      downloadedBytes += value.length;
      fileStream.write(value);
    }
  } finally {
    clearInterval(progressTimer);
    fileStream.end();
    if (totalBytes > 0) {
      onProgress(100); // Final completion update
    }
  }
}


module.exports = async function download(inputs, events) {
  const send = (topic, message) => {
    events.emit(topic, {
      name: inputs.name,
      job: inputs.job,
      ...message
    });
  }

  const getHead = async (url) => {
    const ret = fetch(url, { method: 'HEAD' });
    return ret;
  }

  const cont = await getHead(inputs.url);
  const contentLength = parseInt(cont['headers'].get('content-length'));
  const contentType = cont['headers'].get('content-type');
  const pathParts = path.parse(inputs.url);
  const uid = MD5(pathParts.base);
  const localFile = `${inputs.table}/d-${uid}${pathParts.ext}`;
  let needsDownloaded = false;

  if (!fs.existsSync(localFile)) {
    needsDownloaded = true;
  } else {
    const localStat = fs.statSync(localFile);
    if (localStat.size !== contentLength) {
      needsDownloaded = true;
    }
  }

  if (needsDownloaded) {
    await downloadWithProgress(inputs.url, localFile, (perc) => {
      send('progress', {
        url: inputs.url,
        percentage: perc
      });
    })
  }

  return {
    filePath: localFile,
    path: path.parse(localFile),
    mime: contentType,
    size: contentLength
  }

};
