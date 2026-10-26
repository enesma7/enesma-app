/* Office Hubs configuration.
 * API_URL: the Apps Script web-app URL ending in /exec (Deploy > Manage deployments > Web app URL).
 * Leave empty until the backend is deployed; the page then shows "Booking opens soon" instead of the form.
 * CALENDARS: optional. Calendar IDs per space for the embedded calendars. If left empty they are read
 * from the backend (setup() stores them), so normally only API_URL needs to be set.
 * The office access code is never stored here or anywhere in this repo. */
window.OH_CONFIG = {
  API_URL: '',
  CALENDARS: {
    'rc-desk1': '',
    'rc-desk2': '',
    'rc-desk3': '',
    'rc-conf': ''
  }
};
