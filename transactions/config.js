/* Transaction Center configuration.
 * API_URL: the Apps Script web-app URL ending in /exec (Deploy > Manage deployments > Web app URL).
 * Leave empty until the backend is deployed; the app then offers a demo preview with sample data. */
window.TC_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzYtmzYv74D0yi0sVy-_JaLDYlNLSU795sqhREsqbGYYU1BEDR5KDAB7Du9Mm0Gp4ba/exec',
  APP_NAME: 'Transaction Center',
  GOALS_YEAR: 2027 // year shown/used for agent goals (must match backend TC.GOALS_YEAR)
};
