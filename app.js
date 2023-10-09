/**
 * This script is intended to be a server for use with front-end app: https://github.com/alex-dulac/rsvp-app
 *
 * It authenticates an oauth client to be used with google drive api.
 * The idea is that after the event that folks RSVP'd to,
 * they can visit the site again and see all public pictures uploaded to drive without having to deal with drive UI.
 *
 * Also, just for fun, because I don't want to retire the event site just yet.
 *
 * It's a mess right now.
 * Thanks for coming to my TED talk.
 */

 /**
 * General app setup
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

require('dotenv').config();

const request = require('request');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const process = require('process');
const path = require('path');

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
const { GoogleAuth } = require('google-auth-library');

/**
 * Globals
 */
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CLIENT_ID = process.env.GOOGLE_API_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_API_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_API_REDIRECT_URI;
const APP_PASSWORD = process.env.APP_PASSWORD;
const APP_BASE_URL = process.env.APP_BASE_URL;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * Verify password (one password for all users as determined by .env value)
 */
app.get('/login', function (req, res) {
    const input = req.body?.input;
    const correctPassword = input === APP_PASSWORD;
    res.json({correctPassword: correctPassword});
    // authorize on log in?
});

/**
 * Get photos from google drive
 */
app.get('/photos', async function (req, res) {
    const drive = google.drive({
        version: 'v3',
        auth: process.env.GOOGLE_API_KEY
    })

    // drive....
});

/**
 * Everything below this is faulty at best.
 */

/**
 * Authorize oauth2 client for use with google api
 */
app.get('/authorize', async function (req, res) {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state: JSON.stringify({
            callbackUrl: REDIRECT_URI,
        })
    });

    request(url, (error, response, body) => {
        console.log("token url: " + url);
        res.sendStatus(200);
    });
});

/**
 * Get and save refresh token after authorize redirect
 */
app.get('/tokens', async function (req, res) {
    const url = new URL(APP_BASE_URL + req.url);
    const code = url.searchParams.get('code');
    const oauth2Client = getOAuth2Client();
    const tokens = await oauth2Client.getToken(code);
    saveCredentials(tokens);
});

function getOAuth2Client() {
    return new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );
}

function saveCredentials(tokens) {
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        access_token: tokens.tokens.access_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload, (error) => {
        if (error) {
            console.error(error);
        }
        console.log("token.json has been updated.")
    });
}

/**
 * We can skip authorization if we already have an access token
 */
async function getAccessToken() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return credentials.access_token ?? null;
    } catch (err) {
        return null;
    }
}

/**
 * Test endpoint to get files list directly using GoogleAuth
 * work-in-progress
 */
app.get('/google-auth-test', async function (req, res) {
    const auth = new GoogleAuth({
        scopes: SCOPES
    })
    const client = auth.getClient();
    const projectId = auth.getProjectId();
    const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
    const response = await client.request({ url });
    console.log(response.data);
});

async function listFiles(drive) {
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

function useApiKey() {
    const drive = google.drive({
        version: 'v3',
        auth: process.env.GOOGLE_API_KEY
    })
    return listFiles();
}

// useApiKey().then(() => {});
