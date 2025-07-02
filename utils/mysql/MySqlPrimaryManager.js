const mysql = require('mysql2');
const { Table } = require('../../templates/Migration.class');
const { topologicalSort } = require('../topologicalSort');


class MySqlPrimaryManager {
    primaryConnectionObject = {
        connection: null
    }
    env = null;
    /**
     *
     */
    constructor(env) {
        this.env = env;
    }
    initPrimaryConnection() {
        this.primaryConnectionObject.connection = mysql.createConnection({
            host: this.env.dbHost,
            user: this.env.dbUser,
            password: this.env.dbPassword,
            port: this.env.dbPort,
            ssl: this.env.ssl
        });
        try {
            this.primaryConnectionObject.connection.connect()

        } catch (error) {
            console.log(error)
        }
    }


    createDatabaseIfNotExists() {
        this.initPrimaryConnection()
        return this.primaryConnectionObject.connection.query({
            sql: `CREATE DATABASE IF NOT EXISTS ${env.dbName} DEFAULT CHARACTER SET = 'utf8mb4';`,
            values: []
        }, (err, data) => {
            if (err) console.log(err, "oopsie")
            this.primaryConnectionObject.connection.end()
        })
    }


    executeSqlAsyncPrimary({ sql, values }) {
        return new Promise((resolve, reject) => {
            this.primaryConnectionObject.connection.query({
                sql, values
            }, (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    }

    async getForeignKeys() {
        return this.executeSqlAsyncPrimary({
            sql: `SELECT
                        con.table_name AS source_table,
                        col.column_name AS source_column,
                        con.referenced_table_name AS target_table,
                        col.referenced_column_name AS target_column
                    FROM
                        information_schema.key_column_usage AS col
                        JOIN information_schema.referential_constraints AS con ON col.constraint_name = con.constraint_name
                    WHERE
                        col.table_schema = '${this.env.dbName}'
                        AND col.table_name in (
                            SELECT table_name
                            FROM
                                information_schema.tables
                            WHERE table_schema = '${this.env.dbName}'
                        );`,
            values: []
        });
    }



    async describeDb(isHandleConnection = true) {
        try {
            let env = this.env;
            if (isHandleConnection)
                this.initPrimaryConnection();

            let existence = await this.executeSqlAsyncPrimary({
                sql: `SELECT SCHEMA_NAME
                    FROM INFORMATION_SCHEMA.SCHEMATA
                    WHERE SCHEMA_NAME = ?;`,
                values: [this.env.dbName]
            });
            if (!existence.length) {
                throw new Error(`The database ${env.dbName} does not exist!`);
            }

            let tables = await this.executeSqlAsyncPrimary({
                sql: `SELECT table_name as name
                FROM information_schema.tables
                WHERE table_schema = ?;
                `,
                values: [env.dbName]
            });



            tables = tables.map(({ name }) => name);

            let foreignKeys = await this.getForeignKeys();
            let sortedTables = topologicalSort(tables, foreignKeys);

            let tableDataList = [];

            for (let tableName of sortedTables) {
                let cols = []
                let fkeys = []
                await Promise.all([
                    this.executeSqlAsyncPrimary({
                        sql: `DESCRIBE ${env.dbName}.${tableName};`,
                        values: []
                    }).then(desc => {
                        cols = desc
                    }),
                    this.executeSqlAsyncPrimary({
                        sql: `SELECT
                                con.table_name AS source_table,
                                con.referenced_table_name AS target_table,
                                col.column_name AS source_column,
                                col.referenced_column_name AS target_column,
                                col.CONSTRAINT_NAME as cname
                            FROM
                                information_schema.key_column_usage AS col
                                JOIN information_schema.referential_constraints AS con ON col.constraint_name = con.constraint_name
                            WHERE
                                col.table_schema = '${env.dbName}'
                                AND col.table_name = '${tableName}';`
                    }).then(keys => {
                        fkeys = keys
                    })
                ]);
                tableDataList.push({
                    cols, fkeys, tableName
                });
            }
            return { tableDataList, dbName: env.dbName };


        } catch (error) {
            console.error(error);
            return null;
        }
        finally {
            if (isHandleConnection)
                this.primaryConnectionObject.connection.close()

        }
    }

    async createMigrationFilesFromDb() {

        let fileContents = {}
        try {
            var { tableDataList } = await this.describeDb();
            for (let tableInfo of tableDataList) {
                let { tableName, cols, fkeys } = tableInfo;
                let table = new Table(tableName)
                fileContents[tableName] = table.createMigrationFileText(cols, fkeys);
            } return fileContents;
        } catch (error) {
            return null;
        }
    }

}








module.exports = { MySqlPrimaryManager }