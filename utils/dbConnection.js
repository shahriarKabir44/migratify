const mysql = require('mysql2');
let connectionObject = {
    connection: null
};


function initConnection(env) {
    connectionObject.connection = mysql.createConnection({
        host: env.dbHost,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        port: env.dbPort
    })
    console.log(connectionObject, __dirname)
    connectionObject.connection.connect()
}


module.exports = { connectionObject, initConnection }