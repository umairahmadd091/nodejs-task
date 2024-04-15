const async = require("async");
const express = require('express');
const http = require("http");
const https = require("https");

const app = express();
const PORT = 8080;


const fetchTitle = (address, callback) => {
    address = typeof address === "object" ? address?.url : address
    const formattedAddress = address.includes("://")
      ? address
      : `http://${address}`;
    const protocol = formatAndDecideProtocol(formattedAddress);
  
    protocol
      .get(formattedAddress, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return fetchTitle(res.headers.location, callback);
        } else if (res.statusCode !== 200) {
          return callback(null, {
            name: formattedAddress,
            title: "NO RESPONSE",
          });
        }
        
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          {callback(null, {
            name: formattedAddress,
            title: getTitleFromHtml(data),
          })
        }
        );
      })
      .on("error", (err) =>
        callback(null, { name: formattedAddress, title: "NO RESPONSE" })
      );
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

       async.map(urls, fetchTitle, (err, results) => {
            const responseHtml = generateHTML(results)
            res.send(responseHtml);
    });
});

  app.get('*', (req, res) => {
    res.status(404).send('Not found!');
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
