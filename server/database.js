const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const isHeroku = process.env.DYNO !== undefined;

const schemaPath = path.join(__dirname, 'database', 'schema_postgres.sql');
const technologiesPath = path.join(__dirname, 'game_data_files', 'technologies.json');
const defaultBusinessPath = path.join(__dirname, 'game_data_files', 'default-business.json');

const clientConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (isHeroku) {
  clientConfig.ssl = { rejectUnauthorized: false };
}

const client = new Pool(clientConfig);

const pgSessionStore = isHeroku ? new pgSession({
  conObject: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
  },
}) : new pgSession({
  pool: client
});

client.connect(async err => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the database.');
    const sessionTableExists = await checkTableExists('session');
    console.log('Session table exists:', sessionTableExists);
    if (!sessionTableExists) {
      console.log('Session table does not exist. Initializing database...');
      await initDatabase();
    }
  }
});

const dbRun = async (query, params = [], errorMessage = 'Database error') => {
  try {
    const res = await client.query(query, params);
    if (client._connected) {
      await client.query('COMMIT');
    }
    return res;
  } catch (err) {
    if (client._connected) {
      await client.query('ROLLBACK');
    }
    console.error(`${errorMessage}:`, err.message);
    throw err;
  }
};

const dbGet = (query, params = [], errorMessage = 'Database error') => {
  return client.query(query, params)
    .then(res => res.rows[0])
    .catch(err => {
      console.error(`${errorMessage}:`, err.message);
      throw err;
    });
};

const dbAll = (query, params = [], errorMessage = 'Database error') => {
  return client.query(query, params)
    .then(res => res.rows)
    .catch(err => {
      console.error(`${errorMessage}:`, err.message);
      throw err;
    });
};

const checkTableEmpty = (table) => {
  return dbGet(`SELECT COUNT(*) as count FROM ${table}`).then(row => parseInt(row.count, 10) === 0);
};

const checkTableExists = async (table) => {
  const query = `SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  )`;
  const res = await dbGet(query, [table]);
  return res.exists;
};

const insertData = async (table, data) => {
  const columns = Object.keys(data[0]).join(', ');
  const placeholders = Object.keys(data[0]).map((_, i) => `$${i + 1}`).join(', ');
  const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

  console.log(`Inserting data into ${table}...`);
  console.log('Query:', query);
  for (const item of data) {
    console.log('Data:', item);
    try {
      if (client._connected) {
        await client.query('BEGIN');
      }
      await dbRun(query, Object.values(item));
    } catch (err) {
      console.error(`Failed to insert data into ${table}:`, err.message);
    }
  }
};

const initDatabase = () => {
  console.log('initializing database...');
  return new Promise(async (resolve, reject) => {
    try {
      const sessionTableExists = await checkTableExists('session');
      if (sessionTableExists) {
        console.log('Session table already exists. Skipping initialization.');
        resolve();
        return;
      }
    } catch (err) {
      console.error('Failed to check if session table exists:', err.message);
      reject(err);
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    client.query(schema, async (err) => {
      if (err) {
        console.error('Failed to initialize database schema:', err.message);
        reject(err);
      } else {
        console.log('Database schema initialized.');

        try {
          const technologies = JSON.parse(fs.readFileSync(technologiesPath, 'utf8'));
          const defaultBusiness = JSON.parse(fs.readFileSync(defaultBusinessPath, 'utf8'));

          const isTechnologiesEmpty = await checkTableEmpty('technologies');
          const isBusinesssEmpty = await checkTableEmpty('business');

          if (isTechnologiesEmpty) {
            await insertData('technologies', technologies);
          }

          if(isBusinesssEmpty){
            await insertData('business', defaultBusiness);
          }

          console.log('Products and technologies data inserted if tables were empty.');
          resolve();
        } catch (err) {
          console.error('Failed to insert data:', err.message);
          reject(err);
        }
      }
    });
  });
};

module.exports = { client, initDatabase, dbRun, dbGet, dbAll, pgSessionStore };