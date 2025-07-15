const mssql = require('mssql/msnodesqlv8');


class PrimaryMsSqlManager {
    primaryConnectionObject = {
        connection: null
    };
    env = {}
    /**
     *
     */
    constructor(env) {
        this.env = env;

    }
    async initPrimaryConnection() {
        try {
            this.primaryConnectionObject.connection = await mssql.connect({
                server: "localhost\\SQL16",
                //  database: "SmEms4",
                options: {
                    trustedConnection: true, // Set to true if using Windows Authentication
                    trustServerCertificate: true, // Set to true if using self-signed certificates
                },
                driver: "msnodesqlv8",
            });
        } catch (error) {
            console.log(error)
        }
    }

    async executeSqlAsyncPrimary({ sql, values }) {
        console.log(sql, this.env);
        return new Promise((resolve, reject) => {

            this.primaryConnectionObject.connection.query(sql)
                .then(({ recordset }) => {
                    resolve(recordset)
                })
                .catch(err => {
                    reject(err)
                })


        })
    }






}

module.exports = { PrimaryMsSqlManager }