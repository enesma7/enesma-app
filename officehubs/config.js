/* Office Hubs configuration.
 * API_URL: the Apps Script web-app URL ending in /exec (Deploy > Manage deployments > Web app URL).
 * Leave empty until the backend is deployed; the page then shows "Booking opens soon" instead of the form.
 * CALENDARS: optional. Calendar IDs per space for the embedded calendars. If left empty they are read
 * from the backend (setup() stores them), so normally only API_URL needs to be set.
 * The office access code is never stored here or anywhere in this repo. */
window.OH_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxnTNpjbCLtHquypxArOnFK-9lQIlBd_lUAK5_NDeaUx4jAhYjxsaIahtbaff4bN8DoNw/exec',
  CALENDARS: {
    'rc-desk1': '263811bf9ba5c1d0d1310ed2170fb598d7c7d9ff3a1278f42bb87bca44fde342@group.calendar.google.com',
    'rc-desk2': '7b909c69620258f9d78919042a39b9297b2cb9a8fc3b9fee7b7044372cd76b20@group.calendar.google.com',
    'rc-desk3': 'e141a621de1c9e5e9cc3e77f88946ca8e7040112880df28d3f004ea67b117ed6@group.calendar.google.com',
    'rc-conf': 'd4e387b0c603d2f73a619c5e78f3caa5c62731e99a86c4cf0ecd44d6b71b41ef@group.calendar.google.com'
  }
};
