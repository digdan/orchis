const fs = require('fs');
const path = require('path');
const MD5 = require('../libs/MD5');

const getHead = async (url) => {
  const ret = fetch(url, {method: 'HEAD'});
  return ret;
}

module.exports = async function init(inputs) {
  const cont = await getHead(inputs.url);
  const contentLength = cont['headers'].get('content-length');
  const pathParts = path.parse(inputs.url);
  const uid = MD5(pathParts.base);
  const localFile = `${inputs.table}/${uid}`;
  // Check if uid exists
  if (!fs.existsSync(localFile)) {
    console.log('Needs downloaded');
  }
  return { filePath: localFile }

};
