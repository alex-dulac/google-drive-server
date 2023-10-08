/**
 * Express app setup
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const express = require('express');
const app = express();
const port = 8080;

/**
 * Google API integration
 */
const { google } = require('googleapis');
const fs = require('fs').promises;
const process = require('process');
const os = require('os');
const uuid = require('uuid');
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');

// The file token.json stores the app's access and refresh tokens, and is created automatically when the authorization flow completes for the first time.
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Axios + env + other stuff
 */
require('dotenv').config();
const axios = require('axios');
const request = require('request');
const cors = require('cors');
const urlParse = require('url-parse');
import * as queryParse from 'querystring';
const bodyParser = require('body-parser');

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
 * Tokens
 */
app.get('/tokens', async function (req, res) {
    const queryUrl = new urlParse(req.url);
    console.log(queryUrl);
    const code = queryParse.parse(queryUrl.query).code;

    const oauth2Client = getOAuth2Client();

    const tokens = await oauth2Client.getToken(code);
    console.log(tokens);
});

/**
 * Hey! Listen!
 */
app.listen(port, () => {});

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_API_CLIENT_ID,
        process.env.GOOGLE_API_CLIENT_SECRET,
        process.env.GOOGLE_API_REDIRECT_URL
    );
}
