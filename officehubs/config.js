/* Office Hubs configuration.
 * API_URL: the Apps Script web-app URL ending in /exec (Deploy > Manage deployments > Web app URL).
 * Leave empty until the backend is deployed; the page then shows "Booking opens soon" instead of the form.
 * CALENDARS: optional. Calendar IDs per space for the embedded calendars. If left empty they are read
 * from the backend (setup() stores them), so normally only API_URL needs to be set.
 * The office access code is never stored here or anywhere in this repo. */
window.OH_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwUEzjuEUKXYCYvOX5lIqnIwJ8gNsLs8yspIRy5Cce-dA_5HDlLPx9eWiqXSR31JV81ow/exec',
  CALENDARS: {
    'rc-desk1': 'c_f9965b9958b8be2f7076b7e9a66ed5e1c970b38dccebf91c492f803d15bcb0e0@group.calendar.google.com',
    'rc-desk2': 'c_dffbf0e86732ed44a608944ba64d9754d764fd890411ad674a2ea775c89b6632@group.calendar.google.com',
    'rc-conf': 'c_c0b6ace7e39df9e123296afcde775fac724b619fcd9486fd8522ec4639cce9cc@group.calendar.google.com'
  }
};
