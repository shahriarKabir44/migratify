//const { describeDb, initPrimaryMySqlConnection, primaryConnectionObject } = require('../utils/primaryDBConnection');
const { MySqlPrimaryManager } = require('../utils/mysql/MySqlPrimaryManager');
const { Database } = require('./Database');
const { PrimaryMsSqlManager } = require('../utils/mssql/PrimaryMsSqlManager');
const { singletonMsSqlManagerObj } = require('../utils/mssql/MsSqlDbConnection');
const { Table } = require('../templates/Migration.class');
class DbComparator {
    srcDbName = "";
    destDbNames = [];
    srcDbInfo = {};
    destDbInfoList = [];
    dbConnectionCommonCredential = "";
    dialect = "";
    dbManager = {};
    structuredSrcDbInfo = {};
    structuredDestDbInfo = [];
    primaryDbManager = {};
    /**
     * 
     * @param {string} srcName 
     * @param {[string]} destNames 
     * @param {any} dbConnectionCommonCredential 
     */
    constructor(srcName, destNames, dbConnectionCommonCredential, dialect = "mysql") {
        this.srcDbName = srcName;
        this.destDbNames = destNames;
        this.dbConnectionCommonCredential = dbConnectionCommonCredential;

        this.dialect = dialect;
        Table.dialect = dialect;
        if (dialect == 'mysql') {
            this.primaryDbManager = new MySqlPrimaryManager(this.dbConnectionCommonCredential);

        }
        else if (dialect == 'mssql') {
            this.primaryDbManager = new PrimaryMsSqlManager(this.dbConnectionCommonCredential);
            this.dbManager = singletonMsSqlManagerObj;
        }
    }

    generateCredential(dbName) {
        if (this.dialect == "mysql") {
            let newEnv = JSON.parse(JSON.stringify(this.dbConnectionCommonCredential));
            newEnv.dbName = dbName;
            return newEnv;
        } else if (this.dialect == 'mssql') {
            let newEnv = JSON.parse(JSON.stringify(this.dbConnectionCommonCredential));
            newEnv.dbName = dbName;
            return newEnv;
        }
    }

    async beginProcess() {
        try {
            this.primaryDbManager.initPrimaryConnection();
            this.dbManager.initConnection();
            let hasError = false;
            for (let otherDbName of [this.srcDbName, ...this.destDbNames]) {
                this.dbManager.env = this.generateCredential(otherDbName);
                try {
                    let desc = await this.dbManager.describeDb(true);
                    if (!desc) return;
                    this.destDbInfoList.push(desc);
                } catch (error) {
                    console.log(error);
                    process.exit();
                }

            }


            this.srcDbInfo = this.destDbInfoList.filter(x => x.dbName == this.srcDbName)[0];
            this.destDbInfoList = this.destDbInfoList.filter(x => x.dbName != this.srcDbName);

            this.structuredSrcDbInfo = new Database(this.srcDbInfo, this.generateCredential(this.srcDbName), this.dialect);
            this.structuredDestDbInfo = this.destDbInfoList.map(x => new Database(x, this.generateCredential(x.dbName), this.dialect));


            for (let i = 0; i < this.structuredDestDbInfo.length; i++) {
                await this.structuredDestDbInfo[i].executeDifferences(this.structuredSrcDbInfo);
            }

        } catch (error) {
            console.log(error);
            return false;
        }

        finally {
            // this.primaryDbManager.connection.close()
            this.dbManager.connection.close();
        }
        return true;

    }


}

module.exports = { DbComparator };