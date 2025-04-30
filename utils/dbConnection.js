const mysql = require('mysql2');


class DBConnection {
    static connection = null

    static credential = null;

    static async beginTransaction() {
        await this.initConnection();
        return new Promise((resolve, reject) => {
            this.connection.beginTransaction((err) => {
                if (err) reject(err);
                resolve();
            })
        })

    };
    static async rollback() {
        return new Promise((resolve, reject) => {
            this.connection.rollback((err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }
    static async commit() {
        return new Promise((resolve, reject) => {
            this.connection.commit((err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }
    static async endTransaction() {
        return new Promise((resolve, reject) => {
            this.connection.end((err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }

    static async initConnection() {
        let env = this.credential ?? require(process.cwd() + '/migrations/config.json')

        return new Promise((resolve, reject) => {
            DBConnection.connection = mysql.createConnection({
                host: env.dbHost,
                user: env.dbUser,
                password: env.dbPassword,
                database: env.dbName,
                port: env.dbPort,
                ssl: env.ssl
            })

            DBConnection.connection.connect((err) => {

                if (err) reject(err)
                resolve()
            })
        })

    }

    static ShouldCloseConnectionNow = true;

    static async close() {

        return new Promise((resolve, reject) => {
            if (!this.ShouldCloseConnectionNow) {
                resolve();
            }
            DBConnection.connection.end(e => {
                DBConnection.connection = null
                if (e) reject()
                else resolve()
            })

        })
    }
    static async executeSqlAsync({ sql, values }) {
        return new Promise(function (resolve, reject) {
            if (DBConnection.connection == null) {
                DBConnection.initConnection()
                    .then(() => {
                        DBConnection.connection.query({
                            sql, values
                        }, (err, rows) => {
                            DBConnection.close()
                                .then(() => {
                                    if (err) reject(err)
                                    else resolve(rows)
                                })

                        })
                    })
            }
            DBConnection.connection.query({
                sql, values
            }, (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    }
}




module.exports = { DBConnection }