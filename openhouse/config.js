/* Open House Dashboard configuration.
   TC_API_URL: the existing Transaction Center Apps Script (sign-in, addresses, CRM). Do not change it here
   unless Transaction Center itself moves.
   API_URL: the Open House Apps Script web-app URL ending in /exec. Leave empty until that script is deployed
   (see backend/DEPLOY.md). Empty means open houses stay in this browser and phone QR sign-in is not shared. */
window.OH_CONFIG = {
  TC_API_URL: 'https://script.google.com/macros/s/AKfycbzYtmzYv74D0yi0sVy-_JaLDYlNLSU795sqhREsqbGYYU1BEDR5KDAB7Du9Mm0Gp4ba/exec',
  API_URL: 'https://script.google.com/macros/s/AKfycbwUT-f32V1-neY2t1s5fAHRwiCIII4yqAdGU182ZTmVH6klzQKQL9NCAPUfVUaA3KP-Sw/exec',
  APP_NAME: 'Open House Dashboard'
};
