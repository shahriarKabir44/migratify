const readline = require('readline');
const { DbComparator } = require('./DbComparator');
const fs = require('fs')
const Path = require('path');
const { Database } = require('./Database');
async function prompDisperseDb(path) {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    async function takeInput(question) {
        question += ": "
        return new Promise((resolve, reject) => {
            rl.question(question, (data) => {
                resolve(data)
            });
        })
    }

    try {
        console.log("Welcome to Migratify's Database disperse wizard!");
        let settingFromFile = await takeInput(`Load settings from a json file? \nType the file name from the current directory (${process.cwd()}) without extension. Leave blank otherwise!`);
        let settings = null;
        if (settingFromFile != "") {
            let dir = Path.join(process.cwd(), `${settingFromFile}.json`);
            settings = JSON.parse(fs.readFileSync(dir, "utf-8"));
        }
        if (settings == null) {
            let srcDbName = await takeInput('Source Db Name?');
            let destDbNames = (await takeInput('Destination Db Names Seperate by commas'))
                .split(',').map(x => x.trim());
            if (destDbNames.filter(x => x.trim() == srcDbName)[0]) {
                throw new Error("Destination database list can not contain source database!");
            }

            // let dialectEnumId = await takeInput('Dialect?  1=> MySQL (default)');
            let dialect = 'mysql';
            if (dialect == 'mysql') {
                let dbPort = await takeInput('port (typically 3306. leave blank if so)')
                if (dbPort == '') dbPort = 3306
                let dbHost = await takeInput('database host (typically localhost. leave blank if so) ')
                if (dbHost == '') dbHost = 'localhost'

                let dbPassword = await takeInput('password ')
                let dbUser = await takeInput('user (typically root. leave blank if so)')
                if (dbUser == '') dbUser = 'root'

                let commonEnv = { dbPassword, dbPort, dbUser, dbHost }
                settings = {
                    srcDbName, destDbNames, commonEnv, dialect
                }

            }
        }

        let { srcDbName, destDbNames, commonEnv, dialect } = settings;

        let dbComparator = new DbComparator(srcDbName, destDbNames, commonEnv, dialect);

        Database.isDisposeReadline = false;
        Database.readlineObj = rl;
        let result = await dbComparator.beginProcess();
        if (result) {
            console.log("Ka-Boom! All the databases are now equalized!🤩🤩");

            let doesWannaSave = (await takeInput("Do you want to save the database names and credentials on a file so that you don't have to type them all over again next time? 1/0")) == "1";
            if (doesWannaSave) {
                let fileName = await takeInput(`Give us a file name (without extension) where we'll write all the settings. The file will be save on the current working directory ${process.cwd()}`);
                for (let i = 0; i <= 5; i++) {
                    const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/g; // invalid characters on Windows


                    if (!fileName || typeof fileName !== "string") {
                        console.log("invalid file name!"); continue;
                    };
                    if (fileName.length > 255) { console.log("invalid file name!"); continue; }
                    if (invalidChars.test(fileName)) { console.log("invalid file name!"); continue; }

                    break;
                }
                let dir = Path.join(process.cwd(), `${fileName}.json`);
                fs.writeFileSync(dir, JSON.stringify(settings), { encoding: "utf-8" });

                console.log(`Settings have been dumped to the file (${dir})!`);


            }
            else {
                console.log("Alright! Thanks for using migratify! ☺️")
            }
        }

    } catch (e) {
        console.log(e);
    }

    finally {
        rl.close();
        Database.isDisposeReadline = false;

    }


}

module.exports = { prompDisperseDb };