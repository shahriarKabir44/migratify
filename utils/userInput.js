
const fs = require('fs')
const readline = require('readline');

// Create an interface for reading input

async function createEnv(path) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    async function takeInput(question) {
        return new Promise((resolve, reject) => {
            rl.question(question, (data) => {
                resolve(data)
            });
        })
    }
    try {
        let dialect = await takeInput('Database dialect? \n1: MySql\n2: Microsoft SQL (Windows Auth) \n(Default MySql)');
        if (dialect == '' || dialect * 1 == 1) {
            return createConfigForMySql(takeInput);
        }
        else if (dialect * 1 == 2) {
            return createConfigForMsSql(takeInput);
        }
    } catch (error) {

    }
    finally {

        rl.close()

    }




}
/**
 * 
 * @param {Function} takeInput 
 * @returns 
 */
async function createConfigForMySql(takeInput) {
    let dbName = await takeInput('Database name ')
    let dbPort = await takeInput('port (typically 3306. leave blank if so)')
    if (dbPort == '') dbPort = 3306
    let dbHost = await takeInput('database host (typically localhost. leave blank if so) ')
    if (dbHost == '') dbHost = 'localhost'

    let dbPassword = await takeInput('password ')
    let dbUser = await takeInput('user (typically root. leave blank if so)')
    if (dbUser == '') dbUser = 'root'


    if (!fs.existsSync(path + '/config.json')) {
        fs.writeFileSync(path + '/config.json', "")
    }
    let json = {
        "dbPassword": dbPassword, "dbPort": dbPort, "dbName": dbName, "dbUser": dbUser, "dbHost": dbHost
        , "dialect": "mysql"
    };
    fs.writeFileSync(path + '/config.json', JSON.stringify(json));
    return json;

}

/**
 * 
 * @param {Function} takeInput 
 * @returns 
 */
async function createConfigForMsSql(takeInput) {
    let dbName = await takeInput('Database name ')
    let dbHost = await takeInput('database host (typically localhost. leave blank if so) ')
    if (dbHost == '') dbHost = 'localhost'


    if (!fs.existsSync(path + '/config.json')) {
        fs.writeFileSync(path + '/config.json', "")
    }
    let json = {
        "dbUser": dbUser, "dbHost": dbHost
        , "dialect": "mssql"
    };
    fs.writeFileSync(path + '/config.json', JSON.stringify(json));
    return json;

}


module.exports = { createEnv }


// Handle the close event
