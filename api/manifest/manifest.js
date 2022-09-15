const fetch = require('node-fetch');
const path = require('path');
const { spawn } = require('node:child_process');
const https = require('https');
const fs = require('fs');
const { resolve } = require('node:path');
const { MongoClient } = require('mongodb');

//const BUNGIE_API_KEY = 'ed47e3f48b054bd5a323af81c1990a78'

var componentsManifest = new Map();

async function readComponentsManifest(savedVersions) {

    console.log('Fetching manifest...');
    let json = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest')
        .then(res => res.json())

    console.log('Manifest fetched');

    const limit = 1;
    let count = 0;

    ['ru'].forEach((language) => {

        console.log(`Loading paths for language \'${language}\'`);

        for (let component in json.Response.jsonWorldComponentContentPaths[language]) {

            if (savedVersions.get(component) === json.Response.jsonWorldComponentContentPaths[language][component]) {
                console.log(`   ---- ${component}`, '\x1b[32m', 'is UP TO DATE', '\x1b[0m');
            } else {
                console.log(`   ---- ${component}`, '\x1b[33m', 'NEED UPDATE', '\x1b[0m');
                componentsManifest.set(component, json.Response.jsonWorldComponentContentPaths[language][component]);

		count++;
		if (count===limit) break;
            }
        }

        console.log(`Done...`)

    })
}

async function downloadManifestComponentsData() {

	console.log();
	console.log();
	console.log();

    for ([key, value] of componentsManifest) {
        console.log(`Downloading component ${key}...`);
        await downloadComponent(key, value);
        await mongoImportComponent(key);
    };

}


function downloadComponent(componentName, pathTo) {

    let fileName = path.join(__dirname, 'downloads', componentName + '.json');

    const file = fs.createWriteStream(fileName);
    return new Promise((resolve, reject) => {

        https.get('https://www.bungie.net' + pathTo, (response) => {
            response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log(`Download of ${componentName} completed`);
                resolve();
            });
        })

    });

}

function mongoImportComponent(componentName) {

    console.log(`Move component data into database...`);
    let fileName = path.join(__dirname, 'downloads', componentName + '.json');
    //const command = `mongoimport --uri mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin --collection ${componentName} --type json --file ${fileName} --drop`;

    return new Promise((resolve, reject) => {

        const cmd = spawn('mongoimport',
            [
                '--uri',
                'mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin',
                '--collection',
                componentName,
                '--type',
                'json',
                '--file',
                fileName,
                '--drop'
            ]);

        cmd.stdout.on('data', (data) => {
            console.log(`${data}`);
        });


        cmd.stderr.on('data', (data) => {
            console.error(`${data}`);
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

    for ([key, value] of componentsManifest) {

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
        console.log(`   --- ${doc.componentName} ${doc.pathTo}`);
    });

    client.close();

    return savedVersions;

}

(async () => {

    const savedVersions = await readSavedVersions();
    await readComponentsManifest(savedVersions);
    await downloadManifestComponentsData();
    await saveDownloadedVersionsInDatabase();
    console.log('Operation done successfully');

})()
