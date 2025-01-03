-- Defines the business in the game
CREATE TABLE IF NOT EXISTS business (
  id SERIAL PRIMARY KEY,
  name TEXT,
  business_name TEXT,
  money INTEGER DEFAULT 0,
  order_spawn_milliseconds INTEGER DEFAULT 15000,
  order_spawn_count INTEGER DEFAULT 1,
  orders_per_ship INTEGER DEFAULT 1,
  shipping_speed INTEGER DEFAULT 2000,
  building_speed INTEGER DEFAULT 2000,
  products_per_order INTEGER DEFAULT 1,
  products_per_build INTEGER DEFAULT 3,
  progress INTEGER DEFAULT 0,
  is_shipping BOOLEAN DEFAULT FALSE, --Deprecated
  tech_points INTEGER DEFAULT 0,
  tech_level INTEGER DEFAULT 1,
  orders_shipped INTEGER DEFAULT 0,
  products_built INTEGER DEFAULT 0,
  total_money_earned INTEGER DEFAULT 0,  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  reputation INTEGER DEFAULT 50,
  final_money INTEGER DEFAULT 0,
  final_tech_level INTEGER DEFAULT 0,
  final_orders_shipped INTEGER DEFAULT 0,
  final_reputation INTEGER DEFAULT 0,
  shipping_points INTEGER DEFAULT 0,
  building_points INTEGER DEFAULT 0,
  order_spawn_points INTEGER DEFAULT 0,
  available_points INTEGER DEFAULT 0,
  points_spent INTEGER DEFAULT 0,
  last_game_update TIMESTAMP,
  xp INTEGER DEFAULT 0,
  shipping_automation_enabled BOOLEAN DEFAULT TRUE,
  building_automation_enabled BOOLEAN DEFAULT TRUE,
  expiration_reason TEXT,
  exclusive_logistics_penalty_applied BOOLEAN DEFAULT FALSE,
  hostile_takeover_business_name TEXT,
  advertising_campaign_start_time TIMESTAMP
);

-- Defines the global set of products that can be built
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  name TEXT,
  description TEXT,
  category TEXT,
  emoji TEXT,
  weight REAL,
  cost_to_build INTEGER,
  sales_price INTEGER,
  on_hand INTEGER DEFAULT 0,
  start_time TIMESTAMP,
  duration INTEGER,
  active BOOLEAN DEFAULT FALSE,
  quantity_per_build INTEGER DEFAULT 1,
  FOREIGN KEY (business_id) REFERENCES business(id)
);

-- Defines the orders a business has
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  start_time TIMESTAMP,
  duration INTEGER,
  due_by_time TIMESTAMP,
  distance INTEGER,
  product_quantity INTEGER,
  shipping_cost INTEGER, -- Add this line
  active BOOLEAN DEFAULT TRUE,
  state TEXT DEFAULT 'AwaitingShipment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES business(id)
);

-- Defines the products required for each order
CREATE TABLE IF NOT EXISTS order_products (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Defines the technologies available to the business
CREATE TABLE IF NOT EXISTS technologies (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT,
  tech_level_required INTEGER,
  cost INTEGER,
  tech_code TEXT,
  modifier_value REAL,
  game_effect TEXT,
  shipstation_kb_link TEXT,
  acquirable BOOLEAN DEFAULT TRUE,
  category TEXT,
  emoji TEXT
);

-- Defines the technologies a business has access to
CREATE TABLE IF NOT EXISTS available_technologies (
  business_id INTEGER,
  tech_id INTEGER,
  tech_code TEXT,
  FOREIGN KEY (business_id) REFERENCES business(id),
  FOREIGN KEY (tech_id) REFERENCES technologies(id)
);

-- Defines the technologies a business has acquired
CREATE TABLE IF NOT EXISTS acquired_technologies (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  tech_id INTEGER,
  tech_code TEXT,
  acquired_date TIMESTAMP,
  acquired_cost INTEGER,
  FOREIGN KEY (business_id) REFERENCES business(id),
  FOREIGN KEY (tech_id) REFERENCES technologies(id)
);

-- Defines the session table for storing session data
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE session ADD CONSTRAINT "session_pkey" PRIMARY KEY (sid);