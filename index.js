const { connectionObject, initConnection } = require('./utils/dbConnection')
const fs = require('fs');
const { createDatabaseIfNotExists, createMigrationFilesFromDb } = require('./utils/primaryDBConnection');
const { createEnv } = require('./utils/userInput');
const commands = process.argv.filter((item, index) => index > 1)
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
        require('dotenv').config()

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
                    console.log(error)
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
    if (fs.existsSync('./.git')) {
        fs.rmSync(__dirname + '/.git', {
            recursive: true,
        })
    }
    createEnv(__dirname).then(() => {
        require('dotenv').config()

        createDatabaseIfNotExists(process.env)

    })

}
else if (commands[0] == 'load-db') {
    if (fs.existsSync('./.git')) {
        fs.rmSync(__dirname + '/.git', {
            recursive: true,
        })
    }
    createEnv(__dirname).then(() => {
        require('dotenv').config()
        if (!fs.existsSync('migrations')) {
            fs.mkdirSync('migrations', { recursive: true });
        }

        createMigrationFilesFromDb(process.env)
            .then(contents => {
                for (let tableName in contents) {
                    const newFileName = (new Date()) * 1 + "create-table_" + tableName + '.js'

                    if (!fs.existsSync('./migrations/index.txt')) {
                        fs.writeFileSync('./migrations/index.txt', `${newFileName}`)
                        fs.writeFileSync('./migrations/logs.txt', `${newFileName}`)

                    }
                    else {
                        let migratorIndexContents = fs.readFileSync('./migrations/index.txt').toString()
                        fs.writeFileSync(__dirname + '/migrations/index.txt', migratorIndexContents + `\n${newFileName}`)
                        fs.writeFileSync(__dirname + '/migrations/logs.txt', migratorIndexContents + `\n${newFileName}`)

                    }

                    fs.writeFileSync('./migrations/' + newFileName, contents[tableName])

                }
            })

    })

}
else if (commands[0] == 'clear') {
    if (fs.existsSync('./migrations/logs.txt')) {
        fs.unlinkSync('./migrations/logs.txt')
    }
}
else if (commands[0] == 'help') {
    console.log("create-db : creates database with the name given in the .env file")
    console.log("load-db : creates migration files from an existing database")
    console.log('create-table <table name>: creates a migration file for creating a table named <table name>')
    console.log('update-table <table name>: creates a migration file for updating a table named <table name>')
    console.log('drop-table <table name>: creates a migration file for dropping a table named <table name>')
    console.log('migrate: runs the migrations')
    console.log('clear: clears the migration history')

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







