const fs = require('fs/promises');
const path = require('path');

var me = path.parse(__filename.split(__dirname + "/").pop()).name;

const TABLE_DIR_DEFAULT = "./table";

async function deleteOldFiles(dirPath) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const files = await fs.readdir(dirPath, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile()) {
      const filePath = path.join(dirPath, file.name);
      const stats = await fs.stat(filePath);

      if ((now - stats.mtimeMs) > oneDayMs) {
        await fs.unlink(filePath);
        console.log(`Deleted: ${filePath}`);
      }
    }
  }
}

/**
 * 
 * @param {*} inputs 
 * @returns 
 */
module.exports = async function initVideoTable(inputs) {
  const tableDir = inputs.path || TABLE_DIR_DEFAULT;
  // Ensure there is a "table" for us to work in
  try {
    if (await fs.stat(tableDir)) {
      await deleteOldFiles(tableDir);
    } else {
      // Clean off old files
      deleteOldFiles(tableDir);
    }
  } catch (e) {
    await fs.mkdir(tableDir);
  }

  return { table: tableDir };
};
