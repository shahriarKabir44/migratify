const mssql = require('mssql/msnodesqlv8');
const { PrimaryMsSqlManager } = require('./PrimaryMsSqlManager');

class MsSqlDbConnection {
    connection = null
    env = {};
    transaction = null;
    credential = null;
    sqlRequest = null;
    /**
     *
     */
    constructor() {
        this.primaryMsSqlManager = new PrimaryMsSqlManager(this.env);

    }
    async beginTransaction() {
        try {
            await this.initConnection();
            this.transaction = new mssql.Transaction(this.connection);
            await this.transaction.begin();
            this.sqlRequest = new mssql.Request(this.transaction);

        } catch (error) {
            console.log(error);
            process.exit();
        }

    };
    async endTransaction() {
        return
    }
    async rollback() {

        try {
            if (this.transaction == null) {
                throw new Error("No Transaction Has Started!");
            } if (this.connection && this.connection.connected) {
                await this.connection.rollback();

            }
        } catch (error) {
            console.log(error);
            process.exit();

        }

    }
    async commit() {

        try {
            if (this.transaction == null) {
                throw new Error("No Transaction Has Started!");
            } await this.transaction.commit();
        } catch (error) {
            console.log(error);
            process.exit();

        }
    }






    async describeDb(isHandleConnection = true) {
        let env = this.env;
        this.primaryMsSqlManager.env = this.env;
        try {
            if (isHandleConnection) {
                await this.initConnection();

            }

            return this.primaryMsSqlManager.describeDb();

        } catch (error) {
            console.error(error);
            process.exit();
            return null;


        }
        finally {
            if (isHandleConnection)
                this.connection.close()

        }
    }





    async initConnection() {
        let env = this.credential ?? this.env ?? require(process.cwd() + '/migrations/config.json')

        return new Promise((resolve, reject) => {
            mssql.connect({
                server: env.dbHost,
                database: env.dbName,
                options: {
                    trustedConnection: true, // Set to true if using Windows Authentication
                    trustServerCertificate: true, // Set to true if using self-signed certificates
                },
                driver: "msnodesqlv8"
            })
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
                        reject(err);
                        console.log(sql, err)
                        process.exit();
                    })



            }
            else {
                this.sqlRequest.query(sql)
                    .then(({ recordset }) => {
                        resolve(recordset)
                    })
                    .catch(err => {
                        reject(err)
                    })
            }

        })

    }
}

let singletonMsSqlManagerObj = new MsSqlDbConnection();


module.exports = { MsSqlDbConnection, singletonMsSqlManagerObj }