const apiCall = (url, options = {}) => {
  const businessId = localStorage.getItem('businessId'); // Assuming businessId is stored in localStorage
  return fetch(url, {
    ...options,
    credentials: 'include', // Ensure the session cookie is sent
    headers: {
      'Content-Type': 'application/json',
      'x-business-id': businessId,
      ...options.headers,
    },
  }).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  });
};

const port = process.env.PORT || 5050;
const baseUrl = window.location.hostname === 'localhost'
  ? `http://localhost:${port}/api`
  : `${window.location.origin}/api`;

export const startShipping = () => {
  return apiCall(`${baseUrl}/ship-order`, {
    method: 'POST',
  });
};

export const createAccount = (accountData) => {
  return apiCall(`${baseUrl}/create-account`, {
    method: 'POST',
    body: JSON.stringify(accountData),
  }).then(response => {
    if (response.success) {
      localStorage.setItem('businessId', response.businessId);
    }
    return response;
  });
};

export const checkSession = () => {
  return apiCall(`${baseUrl}/check-session`);
};

export const fetchGameInfo = () => {
  return apiCall(`${baseUrl}/game-info`);
};

export const purchaseTechnology = (techId) => {
  return apiCall(`${baseUrl}/purchase-technology`, {
    method: 'POST',
    body: JSON.stringify({ techId }),
  });
};

export const fetchLeaderboard = () => {
  return apiCall(`${baseUrl}/leaderboard`);
};

export const resetBusiness = () => {
  return apiCall(`${baseUrl}/reset-business`, {
    method: 'POST',
  }).then(response => {
    if (response.success) {
      localStorage.removeItem('businessId');
    }
    return response;
  });
};

export const startProductBuild = (productId) => {
  return apiCall(`${baseUrl}/build-product`, {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
};

export const completeTruckToWarehouseGame = (succeeded) => {
  return apiCall(`${baseUrl}/complete-truck-to-warehouse-game`, {
    method: 'POST',
    body: JSON.stringify({ succeeded }),
  });
};

export const completeFindTheProductHaystackGame = (succeeded) => {
  return apiCall(`${baseUrl}/complete-find-the-product-haystack-game`, {
    method: 'POST',
    body: JSON.stringify({ succeeded }),
  });
};

export const upgradeSkill = (skill) => {
  return apiCall(`${baseUrl}/upgrade-skill`, {
    method: 'POST',
    body: JSON.stringify({ skill }),
  });
};

export const generateEndGameText = (acquiredTechnologies) => {
  return apiCall(`${baseUrl}/generate-end-game-text`, {
    method: 'POST',
    body: JSON.stringify({ acquiredTechnologies }),
  });
};

export const endGame = () => {
  return apiCall(`${baseUrl}/end-game`, {
    method: 'POST',
  }).then(response => {
    if (response.success) {
      localStorage.removeItem('businessId');
    }
    return response;
  });
};

export const fetchNetworkData = () => {
  return apiCall(`${baseUrl}/network-data`);
};