const { connectionObject, initConnection } = require('./utils/dbConnection')
require('dotenv').config()
const fs = require('fs');
initConnection(process.env)
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
    require('./migrations/index')
}

function createMigrationFiles(newFileName, templateStr) {
    if (!fs.existsSync('migrations')) {
        fs.mkdirSync('migrations', { recursive: true });
    }
    fs.writeFileSync('./migrations/' + newFileName, templateStr)
    //fs.writeFileSync('./migrations/index.js', templateStr)
    if (!fs.existsSync('./migrations/index.js')) {
        fs.writeFileSync('./migrations/index.js', `require('./${newFileName}')`)
    }
    else {
        let migratorIndexContents = fs.readFileSync('./migrations/index.js').toString()
        fs.writeFileSync(__dirname + '/migrations/index.js', migratorIndexContents + `\nrequire('./${newFileName}')`)

    }
}
connectionObject.connection.end()

// let myTable = new Table('test')



// myTable.create()



