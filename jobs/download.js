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

/**
 * 
 * @param {url} inputs 
 * @param {*} events 
 * @returns {file, path, mime, size}
 */
module.exports = async function download(inputs, events) {
  const send = (topic, message) => {
    events.emit(topic, {
      name: inputs.name,
      job: inputs.job,
      ...message
    });
  }

  /**
   * Determines if a string is a URL or a local file path.
   * @param {string} input - The string to test.
   * @returns {'url' | 'file' | 'invalid'} - The result type.
   */
  const detectInputType = (input) => {
    // Try to parse as a URL
    try {
      const parsed = new URL(input);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return 'url';
      }
    } catch (err) {
      // Not a valid URL
    }

    // Normalize and check if the file exists locally
    const resolvedPath = path.resolve(input);
    if (fs.existsSync(resolvedPath)) {
      return 'file';
    }

    return 'invalid';
  }


  /**
   * Gets the size and Content-Type of a local file.
   * @param {string} filePath - The path to the file.
   * @returns {{ size: number, contentType: string } | null} - Object with file size and Content-Type, or null if not a valid file.
   */
  function getFileContentType(filePath) {
    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) return null;

      const contentType = mime.contentType(path.extname(filePath)) || 'application/octet-stream';

      return {
        size: stats.size,
        contentType
      };
    } catch (err) {
      return null;
    }
  }

  const getHead = async (url) => {
    const ret = fetch(url, { method: 'HEAD' });
    return ret;
  }

  if (detectInputType(inputs.url) === "file") {
    const extra = getFileContentType(inputs.url);
    return {
      filePath: inputs.url,
      file: inputs.url,
      path: path.parse(inputs.url),
      mime: extra.contentType,
      size: extra.size
    }
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
    file: localFile,
    path: path.parse(localFile),
    mime: contentType,
    size: contentLength
  }

};
