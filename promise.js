const http = require("http");
const https = require("https");
const url = require("url");
const RSVP = require("rsvp");
const express = require('express');

const app = express();

const formatAndDecideProtocol = (address) => {
  if (!address.includes("://")) {
    address = "http://" + address;
  }
  return address.startsWith("https://") ? https : http;
};

const getTitleFromHtml = (html) => {
  const titleRegex = /<title>(.*?)<\/title>/i;
  const match = html.match(titleRegex);
  return match ? match[1] : "No title found";
};

const fetchTitle = (address) => {
  const formattedAddress = address?.includes("://")
    ? address
    : `http://${address}`;
  return new RSVP.Promise((resolve, reject) => {
    const protocol = formatAndDecideProtocol(formattedAddress);
    protocol
      .get(formattedAddress, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          resolve(fetchTitle(res.headers.location));
        } else if (res.statusCode !== 200) {
          resolve({
            name: formattedAddress,
            title: `Status Code: ${res.statusCode}`,
          });
        } else {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () =>
            resolve({
              name: formattedAddress,
              title: getTitleFromHtml(data),
            })
          );
        }
      })
      .on("error", (e) => {
        resolve({ name: formattedAddress, title: "NO RESPONSE" });
      });
  });
};

const generateHTML = (results)  =>{
    let itemsHtml = results.map(result => `<li> ${result.name} - "${result.title}" </li>`).join('');
    return `<html>
<head></head>
<body>
    <h1> Following are the titles of given websites: </h1>
    <ul>
       ${itemsHtml}
    </ul>
</body>
</html>`;
}


app.get('/I/want/title', (req, res) => {
    let url = req.query?.address || "";

    let urls = [];
    if (typeof url === 'string') {
        urls.push({ name: url, url });
    } else if (Array.isArray(url)) {
        urls = url.map(u => ({ name: u, url: u }));
    } else {
        res.status(400).send('Invalid URL parameter. Must be a string or an array of strings.');
        return;
    }

 
    RSVP.all(urls.map((item)=>fetchTitle(item.url))).then((titles) => {
        const responseHtml = generateHTML(titles)
        res.send(responseHtml)
      });
   
});

app.get('*', (req, res) => {
    res.status(404).send('Not found!');
});

app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});