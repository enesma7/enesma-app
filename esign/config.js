/* ENESMA E-Sign configuration.
 * API_URL: the E-Sign Apps Script web-app URL ending in /exec (Deploy > Manage deployments > Web app URL).
 * Leave it empty until the backend is deployed: the app then shows "E-Sign is coming soon".
 * This is NOT the Transaction Center URL; E-Sign has its own backend (see esign DEPLOY.md). */
window.ES_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz9yr9pL_glGeRq_a1t3q43FObdARB_LPidFTnePscNbMer1rPdGTocmFHqkVvTWLSc/exec'
};
