const mysql = require('mysql2');
const { Table } = require('../templates/Migration.class');
const { topologicalSort } = require('./topologicalSort');
let primaryConnectionObject = {
    connection: null
};




function initPrimaryConnection(env) {
    primaryConnectionObject.connection = mysql.createConnection({
        host: env.dbHost,
        user: env.dbUser,
        password: env.dbPassword,
        port: env.dbPort,
        ssl: env.ssl
    });
    try {
        primaryConnectionObject.connection.connect()

    } catch (error) {
        console.log(error)
    }
}



function createDatabaseIfNotExists(env) {
    initPrimaryConnection(env)
    primaryConnectionObject.connection.query({
        sql: `CREATE DATABASE IF NOT EXISTS ${env.dbName} DEFAULT CHARACTER SET = 'utf8mb4';`,
        values: []
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

async function getForeignKeys(env) {
    return executeSqlAsyncPrimary({
        sql: `SELECT
                    con.table_name AS source_table,
                    col.column_name AS source_column,
                    con.referenced_table_name AS target_table,
                    col.referenced_column_name AS target_column
                FROM
                    information_schema.key_column_usage AS col
                    JOIN information_schema.referential_constraints AS con ON col.constraint_name = con.constraint_name
                WHERE
                    col.table_schema = '${env.dbName}'
                    AND col.table_name in (
                        SELECT table_name
                        FROM
                            information_schema.tables
                        WHERE table_schema = '${env.dbName}'
                    );`,
        values: []
    });
}



async function describeDb(env, isHandleConnection = true) {
    try {
        if (isHandleConnection)
            initPrimaryConnection(env);

        let existence = await executeSqlAsyncPrimary({
            sql: `SELECT SCHEMA_NAME
                FROM INFORMATION_SCHEMA.SCHEMATA
                WHERE SCHEMA_NAME = ?;`,
            values: [env.dbName]
        });
        if (!existence.length) {
            throw new Error(`The database ${env.dbName} does not exist!`);
        }

        let tables = await executeSqlAsyncPrimary({
            sql: `SELECT table_name as name
            FROM information_schema.tables
            WHERE table_schema = ?;
            `,
            values: [env.dbName]
        });



        tables = tables.map(({ name }) => name);

        let foreignKeys = await getForeignKeys(env);
        let sortedTables = topologicalSort(tables, foreignKeys);

        let tableDataList = [];

        for (let tableName of sortedTables) {
            let cols = []
            let fkeys = []
            await Promise.all([
                executeSqlAsyncPrimary({
                    sql: `DESCRIBE ${env.dbName}.${tableName};`,
                    values: []
                }).then(desc => {
                    cols = desc
                }),
                executeSqlAsyncPrimary({
                    sql: `SELECT
                            con.table_name AS source_table,
                            con.referenced_table_name AS target_table,
                            col.column_name AS source_column,
                            col.referenced_column_name AS target_column,
                            col.CONSTRAINT_NAME as cname
                        FROM
                            information_schema.key_column_usage AS col
                            JOIN information_schema.referential_constraints AS con ON col.constraint_name = con.constraint_name
                        WHERE
                            col.table_schema = '${env.dbName}'
                            AND col.table_name = '${tableName}';`
                }).then(keys => {
                    fkeys = keys
                })
            ]);
            tableDataList.push({
                cols, fkeys, tableName
            });
        }
        return { tableDataList, dbName: env.dbName };


    } catch (error) {
        console.error(error);
        return null;
    }
    finally {
        if (isHandleConnection)
            primaryConnectionObject.connection.close()

    }
}

async function createMigrationFilesFromDb(env) {

    let fileContents = {}
    try {
        var { tableDataList } = await describeDb(env);
        for (let tableInfo of tableDataList) {
            let { tableName, cols, fkeys } = tableInfo;
            let table = new Table(tableName)
            fileContents[tableName] = table.createMigrationFileText(cols, fkeys);
        } return fileContents;
    } catch (error) {
        return null;
    }

}

module.exports = { createDatabaseIfNotExists, createMigrationFilesFromDb, describeDb, initPrimaryConnection, primaryConnectionObject }