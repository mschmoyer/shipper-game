const { Client } = require('pg');
const { initDatabase } = require('../database');

const resetDatabase = async () => {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: 'db',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Database schema dropped and recreated.');

    await initDatabase(client);
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
      process.exit(err ? 1 : 0); // Exit the process with appropriate status code
    });
  }
};

resetDatabase();