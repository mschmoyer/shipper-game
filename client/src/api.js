const apiCall = (url, options = {}) => {
  const playerId = localStorage.getItem('playerId'); // Assuming playerId is stored in localStorage
  return fetch(url, {
    ...options,
    credentials: 'include', // Ensure the session cookie is sent
    headers: {
      'Content-Type': 'application/json',
      'x-player-id': playerId,
      ...options.headers,
    },
  }).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  });
};

const baseUrl = `${window.location.origin}/api`; // Pull from the browser's URL and add /api to it

console.log('baseUrl:', baseUrl);
console.log('process.env.REACT_APP_HEROKU_URL:', process.env.REACT_APP_HEROKU_URL);

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
      localStorage.setItem('playerId', response.playerId);
    }
    return response;
  });
};

export const checkSession = () => {
  console.log('baseUrl:', baseUrl);
  console.log('process.env.REACT_APP_HEROKU_URL:', process.env.REACT_APP_HEROKU_URL);
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

export const resetPlayer = () => {
  return apiCall(`${baseUrl}/reset-player`, {
    method: 'POST',
  }).then(response => {
    if (response.success) {
      localStorage.removeItem('playerId');
    }
    return response;
  });
};

export const startProductBuild = () => {
  return apiCall(`${baseUrl}/build-product`, {
    method: 'POST',
  });
};