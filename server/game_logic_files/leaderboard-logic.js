const { dbAll } = require('../database');

async function getLeaderboardData() {
  const ordersShipped = await dbAll(
    'SELECT name, business_name, orders_shipped FROM player ORDER BY orders_shipped DESC LIMIT 10',
    [],
    'Failed to retrieve orders shipped leaderboard'
  );

  const moneyEarned = await dbAll(
    'SELECT name, business_name, total_money_earned FROM player ORDER BY total_money_earned DESC LIMIT 10',
    [],
    'Failed to retrieve money earned leaderboard'
  );

  const techLevel = await dbAll(
    'SELECT name, business_name, tech_level FROM player ORDER BY tech_level DESC LIMIT 10',
    [],
    'Failed to retrieve tech level leaderboard'
  );

  return { ordersShipped, moneyEarned, techLevel };
}

module.exports = { getLeaderboardData };