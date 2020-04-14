const dotenv = require('dotenv');
const { resolve } = require('path');
const axios = require('axios');

dotenv.config({ path: resolve(__dirname, '../.env.development') });

const DISPATCH_URL = 'https://api.github.com/repos/jschuur/videos.learnchinese.club/dispatches'

console.log(`Triggering GitHub Action rebuild...`);

axios.post(DISPATCH_URL, { event_type: "Manual Gatsby site rebuild" }, {
  headers: {
    'Accept': 'application/vnd.github.everest-preview+json',
    'Authorization': `token ${process.env.GITHUB_PERSONAL_TOKEN}`
  }
})
.then(function (response) {
  console.log(`Done (${response.status}: ${response.statusText})\nCheck latest workflow: https://github.com/jschuur/videos.learnchinese.club/actions?query=workflow%3A%22Redeploy+Gatsby+site%22`);
})
.catch(function (err) {
  console.error(`Problem triggering webhook: ${err.message}`);
});
