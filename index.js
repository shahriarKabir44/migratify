const { connectionObject, initConnection } = require('./utils/dbConnection')
require('dotenv').config()
const fs = require('fs');
const { createDatabaseIfNotExists } = require('./utils/primaryDBConnection');
const commands = process.argv.filter((item, index) => index > 1)
require('dotenv').config()
if (commands[0] == 'create-table') {

    const newFileName = (new Date()) * 1 + commands[0] + "_" + commands[1] + '.js'
    let templateStr = fs.readFileSync('./templates/createTable.template.txt').toString()
    templateStr = templateStr.replace('-', commands[1])
    createMigrationFiles(newFileName, templateStr)

}
else if (commands[0] == 'update-table') {

    const newFileName = (new Date()) * 1 + commands[0] + "_" + commands[1] + '.js'

    let templateStr = fs.readFileSync('./templates/updateTable.template.txt').toString()
    templateStr = templateStr.replace('-', commands[1])
    createMigrationFiles(newFileName, templateStr)

}

else if (commands[0] == 'migrate') {
    initConnection(process.env)
    const fileNames = fs.readFileSync('./migrations/index.txt').toString().split('\n')
    if (!fs.existsSync(__dirname + '/migrations/logs.txt')) {
        fs.writeFileSync(__dirname + '/migrations/logs.txt', "")

    }
    const existingList = fs.readFileSync(__dirname + '/migrations/logs.txt').toString().split('\n')
    let existingMap = {}
    for (let existing of existingList) existingMap[existing] = 1
    const writeStream = fs.createWriteStream(__dirname + '/migrations/logs.txt')
    for (let fileName of fileNames) {
        if (existingMap[fileName] == null) {
            require(__dirname + `/migrations/${fileName}`)
            writeStream.write(fileName + '\n')

        }

    }

    writeStream.close()

}

else if (commands[0] == 'create-db') {
    createDatabaseIfNotExists(process.env)

}

function createMigrationFiles(newFileName, templateStr) {
    if (!fs.existsSync('migrations')) {
        fs.mkdirSync('migrations', { recursive: true });
    }
    fs.writeFileSync('./migrations/' + newFileName, templateStr)
    if (!fs.existsSync('./migrations/index.txt')) {
        fs.writeFileSync('./migrations/index.txt', `${newFileName}`)
    }
    else {
        let migratorIndexContents = fs.readFileSync('./migrations/index.txt').toString()
        fs.writeFileSync(__dirname + '/migrations/index.txt', migratorIndexContents + `\n${newFileName}`)

    }
}

try {
    connectionObject.connection.end()

} catch (error) {

}

// let myTable = new Table('test')



// myTable.create()



