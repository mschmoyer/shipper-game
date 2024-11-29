// Filename: server/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { db, initDatabase } = require('./database');
const authRoutes = require('./auth');
const { getShippingStates } = require('./constants');

const app = express();
const port = 5005;

// Middleware
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(session({
  secret: 'AbbaDabbaDoobiePoo',
  resave: false,
  saveUninitialized: false, // Change this to false to avoid creating sessions for unauthenticated users
  cookie: { secure: false, httpOnly: false } // Ensure the cookie is accessible from the client
}));

// // Debug logging middleware
// app.use((req, res, next) => {
//   console.log(`Received ${req.method} request for ${req.url}`);
//   console.log('Session:', req.session);
//   next();
// });

// Database setup
db.serialize(() => {
  initDatabase();
});

// Function to handle operations when an order is shipped
const shippedOrder = (playerId, callback) => {
  const productValue = 50; // Default product value
  db.run('UPDATE player SET money = money + ?, ordersShipped = ordersShipped + 1, totalMoneyEarned = totalMoneyEarned + ? WHERE id = ?', [productValue, productValue, playerId], function (err) {
    if (err) {
      console.error('Failed to update money:', err.message);
      callback(err);
    } else {
      db.get('SELECT money FROM player WHERE id = ?', [playerId], (err, row) => {
        if (err) {
          console.error('Failed to retrieve updated money:', err.message);
          callback(err);
        } else {
          console.log('Order shipped successfully. Updated money:', row.money);
          callback(null);
        }
      });
    }
  });
};

// API routes
app.use('/api', authRoutes);

app.get('/api/check-session', (req, res) => {
  // console.log('Checking Session. Session=', req.session);
  if (req.session.playerId) {
    console.log('Session found for playerId:', req.session.playerId);
    res.json({ loggedIn: true });
  } else {
    console.log('No session found');
    res.json({ loggedIn: false });
  }
});

app.get('/api/game-info', (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to game-info');
    return res.status(401).json({ error: 'No player session' });
  }
  db.get('SELECT businessName, money, techPoints, techLevel, ordersShipped, totalMoneyEarned FROM player WHERE id = ?', [req.session.playerId], (err, row) => {
    if (err) {
      console.error('Failed to retrieve game info:', err.message);
      res.status(500).json({ error: 'Failed to retrieve game info.' });
    } else {
      const gameInfo = row;
      db.get('SELECT * FROM active_orders WHERE playerId = ?', [req.session.playerId], (err, orderRow) => {
        if (err) {
          console.error('Failed to retrieve active order:', err.message);
          res.status(500).json({ error: 'Failed to retrieve active order.' });
        } else {
          // console.log('Active Orders:', orderRow);
          const shippingStates = getShippingStates();
          const shippingDuration = orderRow ? orderRow.duration : 0;
          const startTime = orderRow ? new Date(orderRow.startTime) : null;
          const currentTime = new Date();
          const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;
          const progress = Math.min((elapsedTime / shippingDuration) * 100, 100);
          const isShipping = progress < 100;

          res.json({
            ...gameInfo,
            shippingStates,
            shippingDuration,
            progress,
            isShipping
          });
        }
      });
    }
  });
});

app.post('/api/start-shipping', (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to start-shipping');
    return res.status(401).json({ error: 'No player session' });
  }
  const shippingStates = getShippingStates();
  const shippingDuration = 3; // Duration in seconds

  console.log('Received request to start shipping');

  const startTime = new Date().toISOString();
  db.run('INSERT INTO active_orders (playerId, startTime, duration) VALUES (?, ?, ?)', [req.session.playerId, startTime, shippingDuration], function (err) {
    if (err) {
      console.error('Failed to start shipping:', err.message);
      res.status(500).json({ error: 'Failed to start shipping.' });
    } else {
      db.run('UPDATE player SET isShipping = 1, progress = 0 WHERE id = ?', [req.session.playerId], function (err) {
        if (err) {
          console.error('Failed to update shipping status:', err.message);
          res.status(500).json({ error: 'Failed to update shipping status.' });
        } else {
          console.log('Shipping started successfully');
          res.json({ 
            message: 'Shipping started successfully.',
            shippingDuration,
            shippingStates
          });
        }
      });
    }
  });
});

app.post('/api/update-progress', (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to update-progress');
    return res.status(401).json({ error: 'No player session' });
  }
  const { progress } = req.body;
  db.run('UPDATE player SET progress = ? WHERE id = ?', [progress, req.session.playerId], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to update progress.' });
    } else {
      res.json({ message: 'Progress updated successfully.' });
    }
  });
});

app.post('/api/complete-shipping', (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to complete-shipping');
    return res.status(401).json({ error: 'No player session' });
  }
  db.run('UPDATE player SET isShipping = 0, progress = 100 WHERE id = ?', [req.session.playerId], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to complete shipping.' });
    } else {
      db.run('DELETE FROM active_orders WHERE playerId = ?', [req.session.playerId], function (err) {
        if (err) {
          res.status(500).json({ error: 'Failed to delete active order.' });
        } else {
          shippedOrder(req.session.playerId, (err) => {
            if (err) {
              res.status(500).json({ error: 'Failed to update money.' });
            } else {
              res.json({ message: 'Shipping completed successfully.' });
            }
          });
        }
      });
    }
  });
});

// Serve the React frontend
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Close the database on exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Failed to close the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
