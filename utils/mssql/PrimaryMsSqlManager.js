const mssql = require('mssql/msnodesqlv8');
const { topologicalSort } = require('../topologicalSort');


class PrimaryMsSqlManager {
    primaryConnectionObject = {
        connection: null
    };
    env = {}
    /**
     *
     */
    constructor(env) {
        super();
        this.env = env;

    }
    initPrimaryConnection() {
        try {
            this.primaryConnectionObject.connection = mssql.connect({
                server: this.env.server
            });
        } catch (error) {
            console.log(error)
        }
    }

    async executeSqlAsyncPrimary({ sql, values }) {
        return new Promise(function (resolve, reject) {

            this.primaryConnectionObject.connection.query(sql)
                .then(({ recordset }) => {
                    resolve(recordset)
                })
                .catch(err => {
                    reject(err)
                })


        })
    }



    async getForeignKeys() {
        let recordset = await this.executeSqlAsyncPrimary({
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

    async getTableSchemaList(tableName) {
        let data = await this.executeSqlAsyncPrimary({
            sql: `
        USE ${this.env.dbName};
        SELECT
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.IS_NULLABLE,
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
        WHERE c.TABLE_NAME = '${tableName}'
        ORDER BY c.ORDINAL_POSITION;
            
            `,
            values: []
        });
        return data.map(x => {
            let col = {
                Field: x.COLUMN_NAME,
                Type: x.DATA_TYPE,
                Null: x.IS_NULLABLE,
                Default: x.DefaultValue
            }
            if (x.ConstraintType == 'PRIMARY KEY') {
                col.Key = 'PRI';
            }
            if (x.DATA_TYPE.toString().includes('varchar')) {
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
                this.initPrimaryConnection();

            }
            let env = this.env;

            let existence = await this.executeSqlAsyncPrimary({
                sql: `SELECT name 
                FROM sys.databases 
                WHERE name = '${this.env.dbName}';`,
                values: []
            });
            if (!existence.length) {
                throw new Error(`The database ${env.dbName} does not exist!`);
            }

            let tables = await executeSqlAsyncPrimary({
                sql: `SELECT  TABLE_NAME
                FROM ${env.dbName}.INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE';
                `,
                values: []
            });



            tables = tables.map(({ TABLE_NAME }) => TABLE_NAME);

            let foreignKeys = await this.getForeignKeys(env);
            let sortedTables = topologicalSort(tables, foreignKeys);

            let tableDataList = [];

            for (let tableName of sortedTables) {
                let cols = []
                let fkeys = []



                await Promise.all([
                    this.getTableSchemaList().then(desc => {
                        cols = desc
                    }),
                    this.getForeignKeysMsSql().then(keys => {
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
                primaryConnectionObject.connection.close()

        }
    }




}