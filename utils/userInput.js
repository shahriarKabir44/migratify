
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
    fs.writeFileSync(path + '/config.json', `{"dbPassword":"${dbPassword}",\n"dbPort":"${dbPort}",\n"dbName":"${dbName}",\n"dbUser":"${dbUser}",\n"dbHost":"${dbHost}"}`)

    rl.close()
    return {
        dbName,
        dbPort,
        dbHost,
        dbPassword,
        dbUser
    }
    rl.on('close', () => {
    })
}


module.exports = { createEnv }


// Handle the close event
