const apiCall = (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include', // Ensure the session cookie is sent
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  });
};

export const startShipping = () => {
  return apiCall('http://localhost:5005/api/start-shipping', {
    method: 'POST',
  });
};

export const createAccount = (accountData) => {
  return apiCall('http://localhost:5005/api/create-account', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

export const checkSession = () => {
  return apiCall('http://localhost:5005/api/check-session');
};

export const fetchGameInfo = () => {
  return apiCall('http://localhost:5005/api/game-info');
};

export const purchaseTechnology = (techId, cost) => {
  return apiCall('http://localhost:5005/api/purchase-technology', {
    method: 'POST',
    body: JSON.stringify({ techId, cost }),
  });
};