
const { client } = require('./database');

const getAdminStats = async () => {
  const activePlayersQuery = 'SELECT COUNT(*) FROM player WHERE active = TRUE';
  const totalOrdersQuery = 'SELECT COUNT(*) FROM orders';
  const totalProductsBuiltQuery = 'SELECT SUM(products_per_build) FROM player';

  const [activePlayersResult, totalOrdersResult, totalProductsBuiltResult] = await Promise.all([
    client.query(activePlayersQuery),
    client.query(totalOrdersQuery),
    client.query(totalProductsBuiltQuery),
  ]);

  return {
    activePlayers: activePlayersResult.rows[0].count,
    totalOrders: totalOrdersResult.rows[0].count,
    totalProductsBuilt: totalProductsBuiltResult.rows[0].sum,
  };
};

module.exports = { getAdminStats };