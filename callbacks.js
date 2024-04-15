const express = require('express');
const http = require("http");
const https = require("https");

const app = express();
const PORT = 8080;




const fetchTitle = (formattedAddress, callback, redirectsFollowed = 0) => {
    const protocol = formatAndDecideProtocol(formattedAddress);
    protocol
      .get(formattedAddress, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (redirectsFollowed < 5) {
            return fetchTitle(
              res.headers.location,
              callback,
              redirectsFollowed + 1
            );
          } else {
            return callback("Too many redirects", null);
          }
        }
  
        if (res.statusCode !== 200) {
          return callback(`Status Code: ${res.statusCode}`, null);
        }
  
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => callback(null, getTitleFromHtml(data)));
      })
      .on("error", (err) => callback(err.message, null));
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

    let results = [];

    const processURL = (index) => {
        if (index >= urls.length) {
            const htmlResponse = generateHTML(results);
            res.send(htmlResponse);
            return;
        }
        const site = urls[index];
        const formattedAddress = site.url.includes("://")
        ? site.url
        : `http://${site.url}`;

        fetchTitle(formattedAddress, (err, title) => {
            if (err) {
                results.push({ name: site.name, title: "NO RESPONSE" });
            } else {
                results.push({ name: site.name, title: title });
            }
            processURL(index + 1);
        });
    }

    processURL(0);
});

app.get('*', (req, res) => {
    res.status(404).send('Not found!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
