const mysql = require('mysql2');


class DBConnection {
    static connection = null
    static async initConnection(env) {
        return new Promise((resolve, reject) => {
            this.connection = mysql.createConnection({
                host: env.dbHost,
                user: env.dbUser,
                password: env.dbPassword,
                database: env.dbName,
                port: env.dbPort
            })

            this.connection.connect((err) => {
                if (err) reject(err)
                resolve()
            })
        })

    }
    static async executeSqlAsync({ sql, values }) {
        return new Promise(function (resolve, reject) {
            this.connection.query({
                sql, values
            }, (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    }
}




module.exports = { DBConnection }