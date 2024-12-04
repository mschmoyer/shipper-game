const { client, initDatabase } = require('../database');

const resetDatabase = async () => {
  try {
    await client.connect();
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Database schema dropped and recreated.');

    await initDatabase();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize the database:', err.message);
  } finally {
    // console.log('Closing the database connection.');
    // client.end(err => {
    //   if (err) {
    //     console.error('Failed to close the database connection:', err.message);
    //   } else {
    //     console.log('Database connection closed.');
    //   }
    //   process.exit(err ? 1 : 0); // Exit the process with appropriate status code
    // });
      process.exit(0); // Exit the process with appropriate status code
  }
};

resetDatabase();