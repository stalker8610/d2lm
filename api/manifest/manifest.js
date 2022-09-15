const fetch = require('node-fetch');
const path = require('path');
const { spawn } = require('node:child_process');
const https = require('https');
const fs = require('fs');
const { resolve } = require('node:path');
const { MongoClient } = require('mongodb');

//const BUNGIE_API_KEY = 'ed47e3f48b054bd5a323af81c1990a78'

var collectionsManifest = new Map();

async function readManifestCollections(savedVersions) {

    console.log('Fetching manifest...');
    let json = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest')
        .then(res => res.json())

    console.log('Manifest fetched.');


    let count = 0;

    ['ru'].forEach((language) => {

        console.log('Loading paths for language = ', language);

        for (let collection in json.Response.jsonWorldComponentContentPaths[language]) {

            if (savedVersions.get(collection) === json.Response.jsonWorldComponentContentPaths[language][collection]) {
                console.log('   ---- ', collection, '\x1b[32m%s\x1b[0m', ' is UP TO DATE');
            } else {
                console.log('   ---- ', collection, '\x1b[33m%s\x1b[0m', ' NEED UPDATE');
                collectionsManifest.set(collection, json.Response.jsonWorldComponentContentPaths[language][collection]);
                count++;
                if (count > 2) break;
            }
        }

        console.log(`Done...`)

        //console.log(collectionsManifest);
    })
}

async function downloadManifestCollectionsData() {

    for ([key, value] of collectionsManifest) {
        console.log(`Downloading collection ${key}...`);
        await downloadCollection(key, value);
        await mongoImport(key);
    };

}


function downloadCollection(collectionName, pathTo) {

    let fileName = path.join(__dirname, 'downloads', collectionName + '.json');

    const file = fs.createWriteStream(fileName);
    return new Promise((resolve, reject) => {

        https.get('https://www.bungie.net' + pathTo, (response) => {
            response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log("Download of ${collectionName} completed");
                resolve();
            });
        })

    });

}

function mongoImport(collectionName) {

    console.log(`Move data into database...`);
    let fileName = path.join(__dirname, 'downloads', collectionName + '.json');
    //const command = `mongoimport --uri mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin --collection ${collectionName} --type json --file ${fileName} --drop`;

    return new Promise(() => {

        const cmd = spawn('mongoimport',
            [
                '--uri',
                'mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin',
                '--collection',
                collectionName,
                '--type',
                'json',
                '--file',
                fileName,
                '--drop'
            ]);

        cmd.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        cmd.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        cmd.on('close', (code) => {
            console.log(`mongoimport process exited with code ${code}`);
            resolve();
        });
    });
}

async function saveDownloadedVersionsInDatabase() {

    const client = new MongoClient('mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin');
    await client.connect();

    const collection = client.db('d2lm').collection('savedManifestVersions');

    for ([key, value] of collectionsManifest) {

        filter = { componentName: key }

        const updateDoc = {
            $set: {
                pathTo: value
            },
        };

        await collection.updateOne(filter, updateDoc, { upsert: true });
        console.log('Version of ',key,' saved in db');
    }

    client.close();
}

async function readSavedVersions() {

    console.log('Saved versions of components:');
  
    let savedVersions = new Map();

    const client = new MongoClient('mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin');
    await client.connect();

    const collection = client.db('d2lm').collection('savedManifestVersions');
    await collection.find().forEach((doc) => {
        savedVersions.set(doc.componentName, doc.pathTo);
        console.log('   --- ', doc.componentName, '  ', doc.pathTo);
    });

    client.close();

    return savedVersions;

}

(async () => {

    const savedVersions = await readSavedVersions();
    await readManifestCollections(savedVersions);
    await downloadManifestCollectionsData();
    await saveDownloadedVersionsInDatabase();
    console.log('Operation done');

})()
