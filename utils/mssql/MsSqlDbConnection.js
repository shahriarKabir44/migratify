const mssql = require('mssql/msnodesqlv8');


class MsSqlDbConnection {
    connection = null

    transaction = null;
    credential = null;
    sqlRequest = null;
    async beginTransaction() {
        try {
            await this.initConnection();
            this.transaction = new mssql.Transaction(this.connection);
            await transaction.begin();
            this.sqlRequest = new mssql.Request(transaction);

        } catch (error) {
            console.log(error);
        }

    };
    async rollback() {

        try {
            if (this.transaction == null) {
                throw new Error("No Transaction Has Started!");
            } if (this.connection && this.connection.connected) {
                await this.connection.rollback();

            }
        } catch (error) {
            console.log(error);

        }

    }
    async commit() {

        try {
            if (this.transaction == null) {
                throw new Error("No Transaction Has Started!");
            } await this.transaction.commit();
        } catch (error) {
            console.log(error);

        }
    }


    async initConnection() {
        let env = this.credential ?? require(process.cwd() + '/migrations/config.json')

        return new Promise((resolve, reject) => {
            mssql.connect(env)
                .then(con => {
                    this.connection = con;
                    resolve(this.connection);
                })
                .catch(err => {
                    reject(err);
                });
        })

    }

    ShouldCloseConnectionNow = true;

    async close() {

        return new Promise((resolve, reject) => {
            if (!this.ShouldCloseConnectionNow) {
                resolve();
            }
            this.connection.close(e => {
                this.connection = null
                if (e) reject()
                else resolve()
            })

        })
    }
    async executeSqlAsync({ sql, values }, isUnderTransaction = false) {
        return new Promise((resolve, reject) => {
            if (!isUnderTransaction) {
                if (this.connection == null) {
                    this.initConnection()
                        .then(() => {
                            this.connection.query(sql)
                                .then(({ recordset }) => {
                                    resolve(recordset)
                                })
                                .catch(err => {
                                    reject(err)
                                })
                        })
                }
                this.connection.query(sql)
                    .then(({ recordset }) => {
                        resolve(recordset)
                    })
                    .catch(err => {
                        reject(err)
                    })



            }

            this.sqlRequest.query(sql)
                .then(({ recordset }) => {
                    resolve(recordset)
                })
                .catch(err => {
                    reject(err)
                })
        })

    }
}




module.exports = { MsSqlDbConnection }