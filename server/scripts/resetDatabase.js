const { client, initDatabase } = require('../database');

const resetDatabase = async () => {
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Database schema dropped and recreated.');

    await initDatabase();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize the database:', err.message);
  } finally {
    client.end(err => {
      if (err) {
        console.error('Failed to close the database connection:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
};

resetDatabase();