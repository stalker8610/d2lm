const express = require('express')
const fetch = require('node-fetch');

var authRouter = express();

const BUNGIE_CLIENT_ID = 41031
const BUNGIE_API_KEY = ""
const BUNGIE_AUTH_URL = "https://www.bungie.net/ru/OAuth/Authorize"
const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/token"


export function getAuthUrl(state) {

    const authUrl = `${BUNGIE_AUTH_URL}?response_type=code&client_id=${BUNGIE_CLIENT_ID}&state=${encodeURIComponent(state)}`;
    return authUrl;

}

function getToken(code, cb) {

    const urlGetToken = BUNGIE_TOKEN_URL;

    const grant_type = 'authorization_code';

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: 'grant_type=' + encodeURIComponent(grant_type) + '&code=' + encodeURIComponent(code) + '&client_id=' + encodeURIComponent(BUNGIE_CLIENT_ID)
    }

    fetch(urlGetToken, options)
        .then(response => response.json())
        .then(responseJSON => cb(responseJSON));

}

function redirectBack(req, res){

    const backURL = req.session.backURL;
    req.session.backURL = '';
    console.log(`redirect URL = ${backURL}`);

    res.redirect(backURL);

}

/* authRouter.options('/getAuthUrl', (req, res) => {
    console.log('get options');
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    }).status(200).send('OK');
})

authRouter.get('/getAuthUrl', (req, res) => {

    res.status(200).set('Access-Control-Allow-Origin', '*').send(getAuthUrl(req.sessionID));

    // if (req.hostname.localeCompare("d2lm.ru")) {
    //   res.status(200).send(getAuthUrl(req.sessionID));
    // }
    // else res.end();

}) */

authRouter.get('/', (req, res, next) => {

    if (req.query.state && decodeURIComponent(req.query.state) == req.sessionID) {

        if (req.query.code) {

            console.log(`Got authorization code = ${req.query.code}`);

            getToken(req.query.code, (response) => {
                console.log(`Got authorization token: \n\r${JSON.stringify(response)}`)
                req.session.token = response.access_token;
                redirectBack(req, res);
            })

        }

        else if (req.query.error) {
            console.log(`Got error while authorization: ${req.query.error}`,);
            redirectBack(req, res);
        }

        else {
            console.log(`Unexpected server behavior, req = ${req}`);
            redirectBack(req, res);
        }

    }

    else
        redirectBack(req, res);

})

authRouter.get('/logout', (req, res) => {

    req.session.regenerate(() => {
        res.status(200).send('Logout done successfully');
    });

});

export default authRouter;