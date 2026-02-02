#!/usr/bin/env node
const fs = require('fs');
const { createEnv } = require('./utils/userInput');
const { rollback } = require('./rollbackUtils/rollback');
const { dumpSchema, dumpData } = require('./utils/schemaDump');
const { promptDisperseDb } = require('./disperseUtils/promptHandler');
const { MySqlPrimaryManager } = require('./utils/mysql/MySqlPrimaryManager');
const { PrimaryMsSqlManager } = require('./utils/mssql/PrimaryMsSqlManager');
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
        let dir = process.cwd() + '/migrations'
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const fileNames = fs.readFileSync(dir + '/index.txt').toString().split(',')
        if (!fs.existsSync(dir + '/logs.txt')) {
            fs.writeFileSync(dir + '/logs.txt', "")
        }
        const existingList = fs.readFileSync(dir + '/logs.txt').toString().split(',')
        let existingMap = {}
        for (let existing of existingList) existingMap[existing] = 1
        let executed = ' ' + existingList.join(' ')
        for (let fileName of fileNames) {
            if (existingMap[fileName] == null) {
                try {
                    let data = await require(dir + `/${fileName}`)();
                    if (data == null) throw new Error("Error!");
                    executed += fileName + ' '
                    existingList.push(fileName)
                    if (!fs.existsSync(dir + '/metadata/')) {
                        fs.mkdirSync(dir + '/metadata/', { recursive: true });
                    }
                    fs.writeFileSync(dir + '/metadata/' + fileName.replace('.js', '.json'), data)

                } catch (error) {
                    console.log(error)
                }

            }

        }
        fs.writeFileSync(dir + '/logs.txt', existingList.join(','))


    })()





}

else if (commands[0] == 'create-db') {

    (async () => {
        // if (fs.existsSync('./.git')) {
        //     fs.rmSync(__dirname + '/.git', {
        //         recursive: true,
        //     })
        // }
        let dir = process.cwd() + '/migrations'
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        let env = await createEnv(dir)
        //if (env.)
        let mySqlPrimaryManager = new MySqlPrimaryManager(env)
        mySqlPrimaryManager.createDatabaseIfNotExists();

    })()


}
else if (commands[0] == 'load-db') {

    (async () => {
        // if (fs.existsSync('./.git')) {
        //     fs.rmSync(__dirname + '/.git', {
        //         recursive: true,
        //     })
        // }
        let dir = process.cwd() + '/migrations'
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        let env = await createEnv(dir);
        let dbManager = {}
        if (env.dialect == 'mysql') {
            dbManager = new MySqlPrimaryManager(env);
        }
        else if (env.dialect == 'mssql') {
            dbManager = new PrimaryMsSqlManager(env);
        }
        dbManager.createMigrationFilesFromDb(env)
            .then(contents => {
                for (let tableName in contents) {
                    const newFileName = (new Date()) * 1 + "create-table_" + tableName + '.js'

                    if (!fs.existsSync(dir + '/index.txt')) {
                        fs.writeFileSync(dir + '/index.txt', `${newFileName}`)
                        fs.writeFileSync(dir + '/logs.txt', `${newFileName}`)

                    }
                    else {
                        let migratorIndexContents = fs.readFileSync(dir + '/index.txt').toString()
                        fs.writeFileSync(dir + '/index.txt', migratorIndexContents + `,${newFileName}`)
                        fs.writeFileSync(dir + '/logs.txt', migratorIndexContents + `,${newFileName}`)

                    }
                    if (!fs.existsSync(dir + '/metadata/')) {
                        fs.mkdirSync(dir + '/metadata/', { recursive: true });
                    }
                    fs.writeFileSync(dir + '/metadata/' + newFileName.replace('.js', '.json'), JSON.stringify({ "case": "create", "table": tableName }))

                    fs.writeFileSync(dir + '/' + newFileName, contents[tableName])

                }
            })
    })()


}
else if (commands[0] == 'clear') {
    let dir = process.cwd() + '/migrations'
    if (fs.existsSync(dir + '/logs.txt')) {
        fs.unlinkSync(dir + '/logs.txt')
    }
}


else if (commands[0] == 'rollback') {
    rollback()
}

else if (commands[0] == 'disperse') {
    promptDisperseDb()
}

else if (commands[0] == 'dump-schema') dumpSchema()
else if (commands[0] == 'dump-data') dumpData()
else if (commands[0] == 'help' || !commands[0]) {
    console.log("create-db : creates database with the name given in the .env file")
    console.log("load-db : creates migration files from an existing database")
    console.log('create-table <table name>: creates a migration file for creating a table named <table name>')
    console.log('update-table <table name>: creates a migration file for updating a table named <table name>')
    console.log('drop-table <table name>: creates a migration file for dropping a table named <table name>')
    console.log('migrate: runs the migrations')
    console.log('rollback: undo the last migration file')
    console.log('dump-schema: creates a SQL file of the schema')
    console.log('dump-data: creates a SQL file of the schema and the data')

    console.log('clear: clears the migration history')
    console.log("disperse : Ships your database changes from a source database to multiple databases!");
}

function createMigrationFiles(commands, type) {
    if (!commands[1]) {
        throw new Error("Pease select a table name!");
    }
    const newFileName = (new Date()) * 1 + commands[0] + "_" + commands[1] + '.js'
    let dir = process.cwd() + '/migrations'
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    let templateStr = fs.readFileSync(__dirname + `/templates/${type}.template.txt`).toString()
    templateStr = templateStr.replace('-', commands[1])

    fs.writeFileSync(dir + '/' + newFileName, templateStr)
    if (!fs.existsSync(dir + '/index.txt')) {
        fs.writeFileSync(dir + '/index.txt', `${newFileName}`)
    }
    else {
        let migratorIndexContents = fs.readFileSync(dir + '/index.txt').toString()
        fs.writeFileSync(dir + '/index.txt', migratorIndexContents + `,${newFileName}`)

    }
}







