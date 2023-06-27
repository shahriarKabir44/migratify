const { connectionObject, initConnection } = require('./utils/dbConnection')
require('dotenv').config()
const fs = require('fs');
const { createDatabaseIfNotExists } = require('./utils/primaryDBConnection');
const commands = process.argv.filter((item, index) => index > 1)
require('dotenv').config()
if (commands[0] == 'create-table') {

    createMigrationFiles(commands, 'createTable')


}
else if (commands[0] == 'update-table') {
    createMigrationFiles(commands, 'updateTable')

}
else if (commands[0] == 'drop-table') {
    createMigrationFiles(commands, 'dropTable')

}

else if (commands[0] == 'migrate') {


    (async () => {

        initConnection(process.env)
        const fileNames = fs.readFileSync('./migrations/index.txt').toString().split('\n')
        if (!fs.existsSync(__dirname + '/migrations/logs.txt')) {
            fs.writeFileSync(__dirname + '/migrations/logs.txt', "")

        }
        const existingList = fs.readFileSync(__dirname + '/migrations/logs.txt').toString().split('\n')
        let existingMap = {}
        for (let existing of existingList) existingMap[existing] = 1
        let executed = existingList.join('\n')
        for (let fileName of fileNames) {
            if (existingMap[fileName] == null) {
                try {
                    await require(__dirname + `/migrations/${fileName}`)()
                    executed += fileName + '\n'


                } catch (error) {
                    console.log(fileName)
                }

            }

        }

        let writeStream = fs.createWriteStream(__dirname + '/migrations/logs.txt')
        writeStream.write(executed)
        writeStream.close()
        connectionObject.connection.end()
    })()





}

else if (commands[0] == 'create-db') {
    createDatabaseIfNotExists(process.env)

}

function createMigrationFiles(commands, type) {
    const newFileName = (new Date()) * 1 + commands[0] + "_" + commands[1] + '.js'


    let templateStr = fs.readFileSync(`./templates/${type}.template.txt`).toString()
    templateStr = templateStr.replace('-', commands[1])
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


} catch (error) {

}

// let myTable = new Table('test')



// myTable.create()



