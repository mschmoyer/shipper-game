const fs = require('fs');
const path = require('path');
const { db, initDatabase } = require('../database');

const dbPath = path.join(__dirname, '../database/game.db');
const sessionDbPath = path.join(__dirname, '../database/sessions.sqlite');

const deleteDatabase = (dbFilePath) => {
  if (fs.existsSync(dbFilePath)) {
    fs.unlinkSync(dbFilePath);
    console.log(`Deleted database file: ${dbFilePath}`);
  }
};

const resetDatabase = async () => {
  deleteDatabase(dbPath);
  deleteDatabase(sessionDbPath);

  try {
    await initDatabase();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize the database:', err.message);
    if (err.code === 'SQLITE_IOERR') {
      console.error('Please check your disk space and file permissions.');
    }
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Failed to close the database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
};

resetDatabase();