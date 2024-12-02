-- Defines the player (or the business) in the game
CREATE TABLE IF NOT EXISTS player (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  progress INTEGER DEFAULT 0,
  isShipping BOOLEAN DEFAULT FALSE,
  businessName TEXT DEFAULT 'unknown',
  money INTEGER DEFAULT 0,
  techPoints INTEGER DEFAULT 0,
  techLevel INTEGER DEFAULT 1,
  ordersShipped INTEGER DEFAULT 0,
  totalMoneyEarned INTEGER DEFAULT 0,
  name TEXT,
  email TEXT,
  apiKey TEXT,
  apiSecret TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  finalMoney INTEGER DEFAULT 0,
  finalTechLevel INTEGER DEFAULT 0,
  finalOrdersShipped INTEGER DEFAULT 0,
  finalReputation INTEGER DEFAULT 0
);

-- Defines the global set of products that can be built
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  weight REAL,
  costToBuild INTEGER,
  salesPrice INTEGER,
  imageURL TEXT
);

-- Defines the orders a player has
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playerId INTEGER,
  startTime TIMESTAMP,
  duration INTEGER,
  dueByTime TIMESTAMP,
  distance INTEGER,
  shippingCost INTEGER, -- Add this line
  active BOOLEAN DEFAULT TRUE,
  state TEXT DEFAULT 'AwaitingShipment',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playerId) REFERENCES player(id)
);

-- Defines the inventory purchase orders for a player
CREATE TABLE IF NOT EXISTS purchaseOrders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playerId INTEGER,
  startTime TIMESTAMP,
  duration INTEGER,
  active BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  productId INTEGER,
  quantity INTEGER,
  FOREIGN KEY (playerId) REFERENCES player(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

-- Defines the technologies available to the player
CREATE TABLE IF NOT EXISTS technologies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  techLevelRequired INTEGER,
  cost INTEGER,
  techCode TEXT,
  modifierValue REAL,
  gameEffect TEXT,
  shipstation_kb_link TEXT,
  acquirable BOOLEAN DEFAULT TRUE
);

-- Defines the technologies a player has access to
CREATE TABLE IF NOT EXISTS available_technologies (
  playerId INTEGER,
  techId INTEGER,
  techCode TEXT,
  FOREIGN KEY (playerId) REFERENCES player(id),
  FOREIGN KEY (techId) REFERENCES technologies(id)
);

-- Defines the technologies a player has acquired
CREATE TABLE IF NOT EXISTS acquired_technologies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playerId INTEGER,
  techId INTEGER,
  techCode TEXT,
  acquiredDate TIMESTAMP,
  acquiredCost INTEGER,
  FOREIGN KEY (playerId) REFERENCES player(id),
  FOREIGN KEY (techId) REFERENCES technologies(id)
);

-- Defines which products a player can build
CREATE TABLE IF NOT EXISTS PlayerProducts (
  playerId INTEGER,
  productId INTEGER,
  FOREIGN KEY (playerId) REFERENCES player(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

-- Defines the inventory of a player
CREATE TABLE IF NOT EXISTS inventory (
  playerId INTEGER,
  productId INTEGER,
  onHand INTEGER DEFAULT 0,
  damaged INTEGER DEFAULT 0,
  inTransit INTEGER DEFAULT 0,
  FOREIGN KEY (playerId) REFERENCES player(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);