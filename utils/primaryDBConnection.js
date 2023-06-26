const mysql = require('mysql2');
const executeSqlAsync = require('./promisify')
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

module.exports = { createDatabaseIfNotExists }