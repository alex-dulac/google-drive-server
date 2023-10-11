/** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** ***
 * This script is intended to be a simple server for use with front-end app:
 * https://github.com/alex-dulac/rsvp-app
 *
* *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** */

 /** General setup */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require('dotenv').config();
const process = require('process');
const APP_PASSWORD = process.env.APP_PASSWORD;
const ORIGIN_URL = process.env.ORIGIN_URL;

/** Express */
const express = require('express');
const app = express();
const port = 8080;
const cors = require('cors');
const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.listen(port, () => {});

/** Google API */
const { google } = require('googleapis');
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** ***
 * Endpoints
 *
 * *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** */

/** Verify user input. There's one password for all users as determined by .env value, so this is intentionally basic and unsecure. */
app.get('/login', function (req, res) {
    if (req.headers.origin !== ORIGIN_URL) {
        return res.sendStatus(403);
    }
    const input = req.query.input;
    const correctPassword = input === APP_PASSWORD;
    return res.json({correctPassword: correctPassword});
});

/** Get all photos from a specified Google Drive folder */
app.get('/getFilesByFolder', async function (req, res) {
    if (req.headers.origin !== ORIGIN_URL) {
        return res.sendStatus(403);
    }
    const drive = google.drive({
        version: 'v3',
        auth: GOOGLE_API_KEY
    })

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const apiResponse = await drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'nextPageToken, files(id)',
    });

    let images = [];
    apiResponse.data.files.forEach(file => {
        images.push(file.id);
    });

    return res.json({images: images});
});

/** Get specified file from Google Drive */
app.get('/getFile', async function (req, res) {
    if (req.headers.origin !== ORIGIN_URL) {
        return res.sendStatus(403);
    }
    const drive = google.drive({
        version: 'v3',
        auth: GOOGLE_API_KEY
    })

    const fileId = ''; // put your file ID here
    const apiResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media',
    });

    return res.json(apiResponse.data);
});
