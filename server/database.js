const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'game.db');
const dbDir = path.dirname(dbPath);
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

const productsPath = path.join(__dirname, 'game_data_files', 'products.json');
const technologiesPath = path.join(__dirname, 'game_data_files', 'technologies.json');

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // if (process.env.NODE_ENV !== 'test') {
    //   initDatabase();
    // }
  }
});

const dbRun = (query, params = [], errorMessage = 'Database error') => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        console.error(`${errorMessage}:`, err.message);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

const dbGet = (query, params = [], errorMessage = 'Database error') => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        console.error(`${errorMessage}:`, err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const dbAll = (query, params = [], errorMessage = 'Database error') => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`${errorMessage}:`, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const checkTableEmpty = (table) => {
  return dbGet(`SELECT COUNT(*) as count FROM ${table}`).then(row => row.count === 0);
};

const insertData = (table, data) => {
  const columns = Object.keys(data[0]).join(', ');
  const placeholders = Object.keys(data[0]).map(() => '?').join(', ');
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
    db.exec(schema, async (err) => {
      if (err) {
        console.error('Failed to initialize database schema:', err.message);
        if (err.code === 'SQLITE_IOERR') {
          console.error('Please check your disk space and file permissions.');
        }
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

module.exports = { db, initDatabase, dbRun, dbGet, dbAll };