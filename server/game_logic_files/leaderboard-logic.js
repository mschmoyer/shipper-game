const { dbAll } = require('../database');

async function getLeaderboardData() {
  const ordersShipped = await dbAll(
    `SELECT p.name, p.business_name, p.orders_shipped, pr.name AS product_name, pr.emoji 
     FROM player p
     JOIN player_products pp ON p.id = pp.player_id
     JOIN products pr ON pp.product_id = pr.id
     WHERE p.id > 1 AND p.name != 'Schmo'
     ORDER BY p.orders_shipped DESC LIMIT 10`,
    [],
    'Failed to retrieve orders shipped leaderboard'
  );

  const moneyEarned = await dbAll(
    "SELECT name, business_name, total_money_earned FROM player WHERE id > 1 AND name != 'Schmo' ORDER BY total_money_earned DESC LIMIT 10",
    [],
    'Failed to retrieve money earned leaderboard'
  );

  const techLevel = await dbAll(
    "SELECT name, business_name, tech_level FROM player WHERE id > 1 AND name != 'Schmo' ORDER BY tech_level DESC LIMIT 10",
    [],
    'Failed to retrieve tech level leaderboard'
  );

  const topProductCategories = await dbAll(
    `SELECT pr.category, COUNT(*) AS count
     FROM player p
     JOIN player_products pp ON p.id = pp.player_id
     JOIN products pr ON pp.product_id = pr.id
     WHERE p.id > 1 AND p.name != 'Schmo'
     GROUP BY pr.category
     ORDER BY count DESC LIMIT 10`,
    [],
    'Failed to retrieve top product categories leaderboard'
  );

  return { ordersShipped, moneyEarned, techLevel, topProductCategories };
}

module.exports = { getLeaderboardData };