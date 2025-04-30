const { describeDb, initPrimaryConnection, primaryConnectionObject } = require('../utils/primaryDBConnection');
const { Database } = require('./Database');

class DbComparator {
    srcDbName = "";
    destDbNames = [];
    srcDbInfo = {};
    destDbInfoList = [];
    dbConnectionCommonCredential = "";
    dialect = "";

    structuredSrcDbInfo = {};
    structuredDestDbInfo = [];

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
    }

    generateCredential(dbName) {
        if (this.dialect == "mysql") {
            let newEnv = JSON.parse(JSON.stringify(this.dbConnectionCommonCredential));
            newEnv.dbName = dbName;
            return newEnv;
        }
    }

    async beginProcess() {
        try {
            initPrimaryConnection(this.dbConnectionCommonCredential);

            for (let otherDbName of [...this.destDbNames, this.srcDbName]) {
                await describeDb(this.generateCredential(otherDbName), false)
                    .then(desc => {
                        if (desc != null) this.destDbInfoList.push(desc);
                        else {
                            return;
                        }
                    })
            }


            this.srcDbInfo = this.destDbInfoList.filter(x => x.dbName == this.srcDbName)[0];
            this.destDbInfoList = this.destDbInfoList.filter(x => x.dbName != this.srcDbName);

            this.structuredSrcDbInfo = new Database(this.srcDbInfo, this.generateCredential(this.srcDbName));
            this.structuredDestDbInfo = this.destDbInfoList.map(x => new Database(x, this.generateCredential(x.dbName)));


            for (let i = 0; i < this.structuredDestDbInfo.length; i++) {
                await this.structuredDestDbInfo[i].executeDifferences(this.structuredSrcDbInfo);
            }

        } catch (error) {
            console.log(error);
            return false;
        }

        finally {
            primaryConnectionObject.connection.close()

        }
        return true;

    }


}

module.exports = { DbComparator };