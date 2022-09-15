const fetch = require('node-fetch');
const path = require('path');
const { spawn } = require('node:child_process');
const https = require('https');
const fs = require('fs');
const { resolve } = require('node:path');

//const BUNGIE_API_KEY = 'ed47e3f48b054bd5a323af81c1990a78'

var collectionsManifest = new Map();

async function readManifestCollections() {

    console.log('Fetching manifest...');
    let json = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest')
        .then(res => res.json())

    console.log('Manifest fetched.');


 let count = 0;

    ['ru'].forEach( (language)=>{ 

        console.log('Loading paths for language = ', language);

        for (let collection in json.Response.jsonWorldComponentContentPaths[language]) {
            console.log('   ---- ', collection);
            collectionsManifest.set(collection, json.Response.jsonWorldComponentContentPaths[language][collection]);
	    count++;
	    if (count>2) break;
        }

        console.log(`Done...`)

        //console.log(collectionsManifest);
    })
}

async function downloadManifestCollectionsData() {

    for ([key, value] of collectionsManifest) {

        console.log(`Downloading collection ${key}...`);
        //await downloadCollection(key, value);
        //await mongoImport(key);

    };

}


function downloadCollection(collectionName, pathTo) {

    let fileName = path.join(__dirname, 'downloads', collectionName+'.json');


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
    let fileName = path.join(__dirname, 'downloads', collectionName+'.json');
    //const command = `mongoimport --uri mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin --collection ${collectionName} --type json --file ${fileName}`;

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


(async () => {

    await readManifestCollections();
    await downloadManifestCollectionsData();

    console.log('Operation done');
  
})()




// module.exports = manifestRouter
