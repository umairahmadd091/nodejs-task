const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const validUrl = require('valid-url');
const { combineLatest } = require('rxjs');


const app = express();

function getTitleOfAddress(url) {
    return axios.request({
        method: "GET",
        headers: {
            'Content-Type': 'text/plain'
        },
        url: url
    });
}

function scrapeTitle(body) {
    const $ = cheerio.load(body);
    const title = $('title').html();
    return `${title}`;
}

function validity(urls) {
    return urls.map(url => {
        if (validUrl.isUri(url)){
            return { url, isValid: true }
        }
        return { url, isValid: false }
    });
}

function sendResponseHTML(url, title) {
    return `
        <html>
        <head></head>
        <body>
            <h1> Following are the titles of given websites: </h1>
    
            <ul>
            <li>${url} - ${title}</li>
            </ul>
        </body>
        </html>`
}


app.get('/I/want/title', async (req, res) => {
    const { address } = req.query;

    if(Array.isArray(address)) {
        const validatedURLS = validity(address);

        const allThePromises = validatedURLS.map(url => url.isValid ? getTitleOfAddress(url.url) : new Promise((resolve, reject) => reject('Invalid URL')));

        combineLatest(allThePromises)
            .subscribe(value => {
                res.send(`
                    <html>
                    <head></head>
                    <body>
                        <h1> Following are the titles of given websites: </h1>
                        <ul>
                            ${value.map(each => `<li>${scrapeTitle(each.data)}</li>`)}
                        </ul>
                    </body>
                    </html>
                `);
            })

    } else {
        if(validUrl.isUri(address)) {
            getTitleOfAddress(address)
            .then(data => {
                const iTitle = scrapeTitle(data.data);
                const url = data.config.url;
                res.send(sendResponseHTML(url, iTitle))
            })
        } else {
            res.send('Invalid URL - NO RESPONSE');
        }
    }

});

app.get('*', (req, res) => {
    res.status(404).send('Not found!');
});

app.listen(8080, () => console.log('Server has started'));