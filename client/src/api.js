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

//const baseUrl = 'https://a1ecf404e6bf.ngrok.app/api'; // Local server URL
const baseUrl = 'http://localhost:5005/api'; // Local server URL
// const baseUrl = 'https://1d6b5eb01f5c.ngrok.app/api'; // Local server URL

export const startShipping = () => {
  return apiCall(`${baseUrl}/start-shipping`, {
    method: 'POST',
  });
};

export const createAccount = (accountData) => {
  return apiCall(`${baseUrl}/create-account`, {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

export const checkSession = () => {
  return apiCall(`${baseUrl}/check-session`);
};

export const fetchGameInfo = () => {
  return apiCall(`${baseUrl}/game-info`);
};

export const purchaseTechnology = (techId, cost) => {
  return apiCall(`${baseUrl}/purchase-technology`, {
    method: 'POST',
    body: JSON.stringify({ techId, cost }),
  });
};

export const fetchLeaderboard = () => {
  return apiCall(`${baseUrl}/leaderboard`);
};

export const resetPlayer = () => {
  return apiCall(`${baseUrl}/reset-player`, {
    method: 'POST',
  });
};

export const startProductBuild = () => {
  return apiCall(`${baseUrl}/build-product`, {
    method: 'POST',
  });
};