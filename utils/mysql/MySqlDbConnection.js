const mysql = require('mysql2');


class MySqlDbConnection {
    connection = null

    credential = null;

    async beginTransaction() {
        await this.initConnection();
        return new Promise((resolve, reject) => {
            this.connection.beginTransaction((err) => {
                if (err) reject(err);
                resolve();
            })
        })

    };
    async rollback() {
        return new Promise((resolve, reject) => {
            this.connection.rollback((err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }
    async commit() {
        return new Promise((resolve, reject) => {
            this.connection.commit((err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }
    async endTransaction() {
        return new Promise((resolve, reject) => {
            this.connection.end((err) => {
                if (err) reject(err);
                resolve();
            })
        })
    }

    async initConnection() {
        let env = this.credential ?? require(process.cwd() + '/migrations/config.json')

        return new Promise((resolve, reject) => {
            this.connection = mysql.createConnection({
                host: env.dbHost,
                user: env.dbUser,
                password: env.dbPassword,
                database: env.dbName,
                port: env.dbPort,
                ssl: env.ssl
            })

            this.connection.connect((err) => {

                if (err) reject(err)
                resolve()
            })
        })

    }

    ShouldCloseConnectionNow = true;

    async close() {

        return new Promise((resolve, reject) => {
            if (!this.ShouldCloseConnectionNow) {
                resolve();
            }
            this.connection.end(e => {
                this.connection = null
                if (e) reject()
                else resolve()
            })

        })
    }
    async executeSqlAsync({ sql, values }) {
        return new Promise((resolve, reject) => {
            if (this.connection == null) {
                this.initConnection()
                    .then(() => {
                        this.connection.query({
                            sql, values
                        }, (err, rows) => {
                            this.close()
                                .then(() => {
                                    if (err) reject(err)
                                    else resolve(rows)
                                })

                        })
                    })
            }
            this.connection.query({
                sql, values
            }, (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    }
}




module.exports = { MySqlDbConnection }