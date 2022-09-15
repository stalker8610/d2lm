const fetch = require('node-fetch');
const path = require('path');
const { spawn } = require('node:child_process');
const https = require('https');
const fs = require('fs');
const fsPromises = fs.promises
const { MongoClient } = require('mongodb');


var componentsManifest = new Map();

async function readComponentsManifest(savedVersions) {

    console.log('Fetching manifest...');
    let json = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest')
        .then(res => res.json())

    console.log('Manifest fetched');

    const limit = 100;
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
                if (count === limit) break;
            }
        }

        console.log(`Done...`)

    })
}

async function downloadManifestComponentsData() {

    console.log('');
    console.log('');
    console.log('');

    const client = new MongoClient('mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin');
    await client.connect();

    const mongoCollection = client.db('d2lm').collection('savedManifestVersions');

    for ([key, value] of componentsManifest) {
        console.log(`Downloading component ${key}...`);
        await downloadComponent(key, value);
        await mongoImportComponent(key);
        await saveDownloadedVersionsInDatabase(mongoCollection, key, value);
    };

    client.close();

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

async function splitJson(fileName, maxFileSize) {

    let resultFileNamesArray = [];

    const data = await fsPromises.readFile(fileName, { encoding: "utf8" });
    let largeJson = JSON.parse(data);

    let resultStr = '{';
    let index = 1;

    for (const [key, value] of Object.entries(largeJson)) {

        const entryJson = `${JSON.stringify(key)}:${JSON.stringify(value)}`;

        if ((resultStr + entryJson).length >= maxFileSize) {

            resultStr = resultStr.substring(0, resultStr.length - 1) + '}';

            let chunkFileName = fileName + index;
            fs.writeFileSync(chunkFileName, resultStr);

            resultFileNamesArray.push(chunkFileName);

            resultStr = '{' + entryJson + ',';
            index++;

        }
        else {
            resultStr += entryJson + ',';
        }

    }

    resultStr = resultStr.substring(0, resultStr.length - 1) + '}';

    let chunkFileName = fileName + index;
    fs.writeFileSync(chunkFileName, resultStr);
    resultFileNamesArray.push(chunkFileName);

    return resultFileNamesArray;
}


async function mongoImportComponent(componentName) {

    console.log(`Move component data into database...`);
    let fileName = path.join(__dirname, 'downloads', componentName + '.json');
    //const command = `mongoimport --uri mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin --collection ${componentName} --type json --file ${fileName} --drop`;

    const maxFileSize = 1024 * 1024 * 10; //10Mb

    const chunks = [fileName];
    const fileSize = fs.statSync(fileName).size;
    let dropCollection = true;

    if (fileSize > maxFileSize) {
        //split large file for chunks to upload into db
        console.log(`Split large file for chunks (total size ${fileSize / 1024 / 1024}MB)...`);
        chunks = await splitJson(fileName, maxFileSize);
        console.log(`Split complete`);
        dropCollection = false;
    }


    for (let index = 0; index < chunks.length; index++) {

        const chunkfileName = chunks[index];

        await new Promise((resolve, reject) => {

            console.log(`Move ${chunkfileName} into database...`);

            const args = [
                '--uri',
                'mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin',
                '--collection',
                componentName,
                '--type',
                'json',
                '--file',
                fileName
            ];

            if (dropCollection || index === 0) args.push['--drop'];
            const cmd = spawn('mongoimport', args);

            cmd.stderr.on('data', (data) => {
                console.error(`${data}`);
            });

            cmd.on('close', (code) => {
                console.log(`mongoimport process exited with code ${code}`);
                resolve();
            });
        });
    }

    if (chunks.length > 1) {
        //remove chunks
        console.log('Flushing chunks...')

        for (let chunkfileName of chunks) {
            await fsPromises.unlink(chunkfileName);
        };

        console.log('Flushing complete');
    }

}

async function saveDownloadedVersionsInDatabase(mongoCollection, componentName, componentVersion) {

    filter = { componentName: componentName }

    const updateDoc = {
        $set: {
            pathTo: componentVersion
        },
    };

    await mongoCollection.updateOne(filter, updateDoc, { upsert: true });
    console.log('Version of ', componentName, ' saved in db');

}

async function readSavedVersions() {

    //console.log('Saved versions of components:');

    let savedVersions = new Map();

    const client = new MongoClient('mongodb://admin:abcd@127.0.0.1:27017/d2lm?authSource=admin');
    await client.connect();

    const collection = client.db('d2lm').collection('savedManifestVersions');
    await collection.find().forEach((doc) => {
        savedVersions.set(doc.componentName, doc.pathTo);
        //console.log(`   --- ${doc.componentName} ${doc.pathTo}`);
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


