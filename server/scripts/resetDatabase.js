const fs = require('fs');
const path = require('path');
const { db, initDatabase } = require('../database');

const dbPath = path.join(__dirname, '../database/game.db');
const sessionDbPath = path.join(__dirname, '../database/sessions.sqlite');

const deleteDatabase = (dbFilePath, callback) => {
  if (fs.existsSync(dbFilePath)) {
    fs.unlinkSync(dbFilePath);
    console.log(`Deleted database file: ${dbFilePath}`);
  }
  callback();
};

deleteDatabase(dbPath, () => {
  deleteDatabase(sessionDbPath, async () => {
    try {
      await initDatabase();
      console.log('Connected to the SQLite database.');
      db.close((err) => {
        if (err) {
          console.error('Failed to close the database:', err.message);
        } else {
          console.log('Database connection closed.');    
        }
      });
    } catch (err) {
      console.error('Failed to initialize the database:', err.message);
      if (err.code === 'SQLITE_IOERR') {
        console.error('Please check your disk space and file permissions.');
      }
    }
  });
});