// https://chriszarate.github.io/bookmarkleter/

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
    window.alert('Error:' + error);
  });
