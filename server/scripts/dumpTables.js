const { client, dbAll } = require('../database');

const dumpTable = async (tableName) => {
  try {
    const rows = await dbAll(`SELECT * FROM ${tableName}`);
    console.log(`Contents of ${tableName}:`);
    console.table(rows);
  } catch (err) {
    console.error(`Failed to dump table ${tableName}:`, err.message);
  }
};

const dumpTables = async () => {
  await dumpTable('player');
  await dumpTable('technologies');
  await dumpTable('products');
  await dumpTable('inventory');
  client.end(err => {
    if (err) {
      console.error('Failed to close the database connection:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
};

dumpTables();