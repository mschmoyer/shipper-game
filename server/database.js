const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  user: 'your_db_user',
  host: 'your_db_host',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
};

const schemaPath = path.join(__dirname, 'database', 'schema_postgres.sql');
const productsPath = path.join(__dirname, 'game_data_files', 'products.json');
const technologiesPath = path.join(__dirname, 'game_data_files', 'technologies.json');

const client = new Client(dbConfig);

client.connect(err => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the PostgreSQL database.');
    // if (process.env.NODE_ENV !== 'test') {
    //   initDatabase();
    // }
  }
});

const dbRun = (query, params = [], errorMessage = 'Database error') => {
  return client.query(query, params)
    .then(res => res)
    .catch(err => {
      console.error(`${errorMessage}:`, err.message);
      throw err;
    });
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
  return dbGet(`SELECT COUNT(*) as count FROM ${table}`).then(row => row.count === 0);
};

const insertData = (table, data) => {
  const columns = Object.keys(data[0]).join(', ');
  const placeholders = Object.keys(data[0]).map((_, i) => `$${i + 1}`).join(', ');
  const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

  console.log(`Inserting data into ${table}...`);
  console.log('Query:', query);
  data.forEach(item => {
    console.log('Data:', item);
    dbRun(query, Object.values(item)).catch(err => {
      console.error(`Failed to insert data into ${table}:`, err.message);
    });
  });
};

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    client.query(schema, async (err) => {
      if (err) {
        console.error('Failed to initialize database schema:', err.message);
        reject(err);
      } else {
        console.log('Database schema initialized.');

        try {
          const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
          const technologies = JSON.parse(fs.readFileSync(technologiesPath, 'utf8'));

          const isProductsEmpty = await checkTableEmpty('products');
          const isTechnologiesEmpty = await checkTableEmpty('technologies');

          if (isProductsEmpty) {
            insertData('products', products);
          }

          if (isTechnologiesEmpty) {
            insertData('technologies', technologies);
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

module.exports = { client, initDatabase, dbRun, dbGet, dbAll };