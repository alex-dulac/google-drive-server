import { createRequire } from "module";
const require = createRequire(import.meta.url);
const express = require('express');
const app = express();

const google = require('googleapis');
const fs = require('fs');
const os = require('os');
const uuid = require('uuid');
const path = require('path');
const authenticate = require('@google-cloud/local-auth');
const drive = google.drive_v3;

require('dotenv').config();

app.get('/event-photos', function (req, res) {
    let photos = [];
    res.json({photos: photos});
});

app.get('/login', function (req, res) {
    const appPassword = process.env.APP_PASSWORD;
    const input = req.body?.input;
    const correctPassword = input === appPassword;
    res.json({correctPassword: correctPassword});
});

app.listen(3000, () => {});
