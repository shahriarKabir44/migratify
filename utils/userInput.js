
const fs = require('fs')
const readline = require('readline');

// Create an interface for reading input
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
async function createEnv(path) {

    let dbName = await takeInput('Database name ')
    let dbPort = await takeInput('port (typically 3306)')
    let dbHost = await takeInput('database host (typically localhost) ')
    let dbPassword = await takeInput('password ')
    let dbUser = await takeInput('user (typically root)')
    if (!fs.existsSync(path + '/.env')) {
        fs.writeFileSync(path + '/.env', "")
    }
    fs.writeFileSync(path + '/.env', `dbPassword="${dbPassword}"\ndbPort=${dbPort}\ndbName=${dbName}\ndbUser="${dbUser}"\ndbHost="${dbHost}"`
    )

    rl.close()

}
module.exports = { createEnv }


// Handle the close event
