const fs = require('fs');
const path = require('path');

const TABLE_DIR = "./table";

module.exports = async function init(inputs) {
  // Ensure there is a "table" for us to work in
  if (!fs.existsSync(TABLE_DIR)){
    fs.mkdirSync(TABLE_DIR);
}
  return { table: TABLE_DIR };
};
