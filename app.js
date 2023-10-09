/**
 * This script is intended to be a server to be used with front-end app: https://github.com/alex-dulac/rsvp-app
 *
 * It authenticates an oauth client to be used with google drive.
 * The idea is that after the event that folks RSVP'd to,
 * they can visit the site again and see all public pictures uploaded to drive.
 *
 * General app setup
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

require('dotenv').config();

const axios = require('axios');
const request = require('request');
const cors = require('cors');
const urlParse = require('url-parse');
import * as queryParse from 'querystring';
const bodyParser = require('body-parser');

/**
 * Express app
 */
const express = require('express');
const app = express();
const port = 8080;
app.listen(port, () => {});

/**
 * Google API integration
 */
const { google } = require('googleapis');
const fs = require('fs').promises;
const process = require('process');
const opn = require('opn');
const os = require('os');
const uuid = require('uuid');
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');

/**
 * Globals
 */
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const CLIENT_ID = process.env.GOOGLE_API_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_API_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_API_REDIRECT_URI;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * Verify password (one password for all users as determined by .env value)
 */
app.get('/login', function (req, res) {
    const appPassword = process.env.APP_PASSWORD;
    const input = req.body?.input;
    const correctPassword = input === appPassword;
    res.json({correctPassword: correctPassword});
});

/**
 * Get photos from google drive
 */
app.get('/photos', function (req, res) {
    const fileIds = getFileIds();
    res.send(fileIds);
    //res.json({fileIds: fileIds});
});

/**
 * Authorize google api for use
 */
app.get('/authorize', function (req, res) {
    if (bypassAuth()) {
        return;
    }

    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state: JSON.stringify({
            callbackUrl: process.env.GOOGLE_API_REDIRECT_URL,
        })
    });

    request(url, (error, response, body) => {
        res.sendStatus(200);
    });
});

/**
 * Get a refresh token on redirect
 */
app.get('/tokens', async function (req, res) {
    const url = new URL(process.env.APP_BASE_URL + req.url);
    const code = url.searchParams.get('code'); // 'code' is the refresh token

    const oauth2Client = getOAuth2Client();
    const tokens = await oauth2Client.getToken(code);
    console.log(tokens);
});

function getOAuth2Client() {
    return new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );
}

/**
 * TODO
 * We can skip authing with google if a valid refresh token is available
 */
function bypassAuth() {
    return false;
}

/**
 * Testing...
 */
app.get('/authorize-3000', function (req, res) {
    const oauth2Client = getOAuth2Client();

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state: JSON.stringify({
            callbackUrl: process.env.GOOGLE_API_REDIRECT_URL,
        })
    });

    request(url, (error, response, body) => {
        res.send(url);
    });
});

/**
 * Testing...
 */
app.get('/tokens-3000', async function (req, res) {
    const queryUrl = new urlParse(req.url);
    console.log(queryUrl);
    const code = queryParse.parse(queryUrl.query).code;

    const oauth2Client = getOAuth2Client();

    const tokens = await oauth2Client.getToken(code);
    console.log(tokens);
});

/**
 * test endpoint using google's quickstart guide: https://github.com/googleworkspace/node-samples/blob/main/drive/quickstart/index.js
 * https://developers.google.com/drive/api/quickstart/nodejs
 */
app.get('/authorize-testing', function (req, res) {
    authorize().then(listFiles).catch(console.error);
});

async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content.toString());
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content.toString());
    const key = keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

async function listFiles(authClient) {
    const drive = google.drive({version: 'v3', auth: authClient});
    const res = await drive.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name)',
    });
    const files = res.data.files;
    if (files.length === 0) {
        console.log('No files found.');
        return;
    }

    console.log('Files:');
    files.map((file) => {
        console.log(`${file.name} (${file.id})`);
    });
}
