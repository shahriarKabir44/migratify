const mysql = require('mysql2');
const { Table } = require('../templates/Migration.class');
let primaryConnectionObject = {
    connection: null
};


function initPrimaryConnection(env) {
    primaryConnectionObject.connection = mysql.createConnection({
        host: env.dbHost,
        user: env.dbUser,
        password: env.dbPassword,
        port: env.dbPort
    })
    primaryConnectionObject.connection.connect()
}



function createDatabaseIfNotExists(env) {
    initPrimaryConnection(env)
    primaryConnectionObject.connection.query({
        sql: `CREATE DATABASE IF NOT EXISTS ${env.dbName} DEFAULT CHARACTER SET = 'utf8mb4';`,
        values: [env.dbName.toString()]
    }, (err, data) => {
        if (err) console.log(err, "oopsie")
        primaryConnectionObject.connection.end()
    })
}


const executeSqlAsyncPrimary = function ({ sql, values }) {
    return new Promise(function (resolve, reject) {
        primaryConnectionObject.connection.query({
            sql, values
        }, (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })
}

async function createMigrationFilesFromDb(env) {
    initPrimaryConnection(env)
    let fileContents = {}

    let tables = await executeSqlAsyncPrimary({
        sql: `SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = ?;
            `,
        values: [env.dbName]
    })
    let promises = []
    tables.forEach(({ TABLE_NAME }) => {
        promises.push((async () => {
            let tableInfo = null
            let foreignKeys = null
            await Promise.all([
                executeSqlAsyncPrimary({
                    sql: `DESCRIBE ${env.dbName}.${TABLE_NAME};`,
                    values: []
                }).then(info => {
                    tableInfo = info
                }),
                executeSqlAsyncPrimary({
                    sql: `SELECT
                        con.constraint_name AS foreign_key_name,
                        con.table_name AS source_table,
                        col.column_name AS source_column,
                        con.referenced_table_name AS target_table,
                        col.referenced_column_name AS target_column
                    FROM
                        information_schema.key_column_usage AS col
                        JOIN information_schema.referential_constraints AS con ON col.constraint_name = con.constraint_name
                    WHERE
                        col.table_schema = '${env.dbName}'
                    AND col.table_name = '${TABLE_NAME}';`,
                    values: []
                }).then(info => {
                    foreignKeys = info
                })
            ])
            let newTable = new Table(TABLE_NAME)
            fileContents[TABLE_NAME] = newTable.createMigrationFileText(tableInfo, foreignKeys)
        })())
    })
    await Promise.all(promises)
    primaryConnectionObject.connection.end()

    return fileContents
}

module.exports = { createDatabaseIfNotExists, createMigrationFilesFromDb }