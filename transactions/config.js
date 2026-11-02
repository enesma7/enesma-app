/* Transaction Center configuration.
 * API_URL: the Apps Script web-app URL ending in /exec (Deploy > Manage deployments > Web app URL).
 * Leave empty until the backend is deployed; the app then offers a demo preview with sample data. */
window.TC_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbw1sMFZhJcB0_9StcSppTufCkAVyoxeI_ZDImOKpsJHl7R4_M4VMdsUXMDSO0gxuGdT/exec',
  APP_NAME: 'Transaction Center',
  GOALS_YEAR: 2027 // year shown/used for agent goals (must match backend TC.GOALS_YEAR)
};
