const mssql = require('mssql/msnodesqlv8');
const { topologicalSort } = require('../topologicalSort');
const { PrimaryMsSqlManager } = require('./PrimaryMsSqlManager')
const fs = require('fs');
class MsSqlDbConnection {
    connection = null
    env = {};
    transaction = null;
    credential = null;
    sqlRequest = null;
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


    async getForeignKeys() {
        let recordset = await this.executeSqlAsync({
            sql: `USE ${this.env.dbName};
            SELECT 
                fk.name AS ForeignKeyName,
                sch1.name AS ForeignKeySchema,
                tab1.name AS source_table,
                col1.name AS source_column,
                sch2.name AS ReferencedSchema,
                tab2.name AS target_table,
                col2.name AS target_column
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.tables tab1 ON fkc.parent_object_id = tab1.object_id
            INNER JOIN sys.schemas sch1 ON tab1.schema_id = sch1.schema_id
            INNER JOIN sys.columns col1 ON fkc.parent_object_id = col1.object_id AND fkc.parent_column_id = col1.column_id
            INNER JOIN sys.tables tab2 ON fkc.referenced_object_id = tab2.object_id
            INNER JOIN sys.schemas sch2 ON tab2.schema_id = sch2.schema_id
            INNER JOIN sys.columns col2 ON fkc.referenced_object_id = col2.object_id AND fkc.referenced_column_id = col2.column_id
            ORDER BY target_table, ForeignKeyName;
            `,
            values: []
        });
        return recordset
    }


    async getTableSchemaList() {
        let data = await this.executeSqlAsync({
            sql: `
        USE ${this.env.dbName};
        SELECT
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
			c.TABLE_NAME,
            COLUMNPROPERTY(object_id(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS IsIdentity,
            dc.definition AS DefaultValue,
            CASE
                WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PRIMARY KEY'
                WHEN fk.COLUMN_NAME IS NOT NULL THEN 'FOREIGN KEY'
                ELSE NULL
            END AS ConstraintType
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN sys.default_constraints dc
            ON dc.parent_object_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME)
            AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'ColumnId')
        LEFT JOIN (
            SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        ) pk ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA AND c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
        LEFT JOIN (
            SELECT cu.TABLE_SCHEMA, cu.TABLE_NAME, cu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
            INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu
                ON rc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
        ) fk ON c.TABLE_SCHEMA = fk.TABLE_SCHEMA AND c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME
         ORDER BY c.ORDINAL_POSITION;
            
            `,
            values: []
        });

        let taken = {};
        data = data.filter(x => {
            if (!taken[x.COLUMN_NAME + '-' + x.TABLE_NAME]) {
                taken[x.COLUMN_NAME + '-' + x.TABLE_NAME] = 1;
                return true;
            }
            return false;
        })

        return data.map(x => {
            let col = {
                Field: x.COLUMN_NAME,
                Type: x.DATA_TYPE,
                Null: x.IS_NULLABLE,
                Default: x.DefaultValue,
                TABLE_NAME: x.TABLE_NAME
            }
            if (x.ConstraintType == 'PRIMARY KEY') {
                col.Key = 'PRI';
            }
            if (x.DATA_TYPE.toString().includes('varchar')) {
                if (col.Default)
                    col.Default = col.Default.replace(/'/g, "''");
                if (x.CHARACTER_MAXIMUM_LENGTH == -1) {
                    col.Type += '(MAX)';

                }

                else col.Type += `(${x.CHARACTER_MAXIMUM_LENGTH})`;
            }
            return col;
        })
    }

    async describeDb(isHandleConnection = true) {
        try {
            if (isHandleConnection) {
                this.initConnection();

            }
            let env = this.env;
            let primaryMsSqlManager = new PrimaryMsSqlManager(env);
            await primaryMsSqlManager.initPrimaryConnection();
            let existence = await primaryMsSqlManager.executeSqlAsyncPrimary({
                sql: `SELECT name 
                FROM sys.databases 
                WHERE name = '${this.env.dbName}';`,
                values: []
            });
            if (!existence.length) {
                throw new Error(`The database ${env.dbName} does not exist!`);
            }

            let tables = await this.executeSqlAsync({
                sql: `SELECT  TABLE_NAME
                FROM ${env.dbName}.INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE' order by TABLE_NAME;
                `,
                values: []
            });



            tables = tables.map(({ TABLE_NAME }) => TABLE_NAME);

            let foreignKeys = await this.getForeignKeys();
            let sortedTables = topologicalSort(tables, foreignKeys);




            let tableDataList = [];
            console.log("==========================================")
            console.log("Loading Table Definitions of " + env.dbName);
            let tableDetailist = await this.getTableSchemaList();
            for (let tableName of sortedTables) {


                let cols = tableDetailist.filter(x => x.TABLE_NAME.toLowerCase() == tableName.toLowerCase());
                let fkeys = []
                fkeys = foreignKeys.filter(x => x.source_table == tableName);
                tableDataList.push({
                    cols, fkeys, tableName
                });
            }
            return { tableDataList, dbName: env.dbName };


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