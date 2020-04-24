/* eslint-disable */

// https://chriszarate.github.io/bookmarkleter/

// Add channel
// fetch('http://localhost:3000/dev/channels', {
fetch('https://data.learnchinese.club/v1/channels', {
  method: 'post',
  body: JSON.stringify({ secret: '', url: encodeURIComponent(window.location.href) })
})
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    window.alert(data.status);
  })
  .catch((error) => {
    window.alert(`Error:${error}`);
  });

// Delete video
// fetch('http://localhost:3000/dev/videos', {
fetch('https://data.learnchinese.club/v1/videos', {
  method: 'delete',
  body: JSON.stringify({ secret: '', url: encodeURIComponent(window.location.href) })
})
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    window.alert(data.status);
  })
  .catch((error) => {
    window.alert(`Error:${error}`);
  });
