const fs = require('fs')
const path = require('path')
const { MySqlDbConnection } = require("../utils/mysql/MySqlDbConnection")
const { singletonMsSqlManagerObj, MsSqlDbConnection } = require('../utils/mssql/MsSqlDbConnection')
class Column {
    name = ""
    dataType = ""
    defaultValue = ""
    isNullable = true
    isPrimaryKey = false
    isAutoIncrement = false
    isUnique = false
    modifiedName = "";

    setNewName(newName) {
        this.modifiedName = newName;
        return this;
    }

    setPrimaryKey(flag = true) {
        this.isPrimaryKey = true
        if (flag) {
            this.isAutoIncrement = true
            this.isNullable = false
        }
        return this
    }
    setUnique(flag = false) {
        this.isUnique = flag
        return this
    }
    constructor(columnName) {
        this.name = columnName
        this.dataType = ""
        this.defaultValue = ""
        this.isNullable = true
        this.isPrimaryKey = false
        this.isAutoIncrement = false
        this.isUnique = false
        this.isDefaultValueSet = false
    }
    setDataType(typeName) {
        this.dataType = typeName
        return this
    }
    setNullable(flag = true) {
        this.isNullable = flag
        return this
    }
    setDefaultValue(defaultValue = "") {
        this.isDefaultValueSet = true
        this.defaultValue = defaultValue
        return this
    }

    getDefaultValueForMySql() {
        const type = this.dataType.toLowerCase();

        // MySQL expanded numeric types
        const numericalTypes = new Set([
            'int', 'integer', 'bigint', 'mediumint', 'smallint',
            'tinyint', 'float', 'double', 'decimal', 'numeric', 'bit'
        ]);

        if (numericalTypes.has(type)) return 0;

        // Handles varchar, char, and various TEXT types (tinytext, longtext, etc.)
        if (type.includes('char') || type.includes('text')) {
            return "''";
        }

        // MySQL Date logic
        if (type === 'datetime' || type === 'date') {
            return "'1000-01-01'"; // MySQL's absolute minimum valid date
        }

        if (type === 'timestamp') {
            return "'1970-01-01 00:00:01'"; // The Unix Epoch floor
        }

        if (type === 'time') {
            return "'00:00:00'";
        }

        if (type === 'year') {
            return '1901'; // Minimum value for the YEAR(4) type
        }

        return "''";
    }

    getDefaultValueForMsSql() {
        let numericalTypes = new Set(['int', 'bigint', 'bit', 'tinyint', 'float', 'real']);
        if (numericalTypes.has(this.dataType.toLowerCase())) return 0;
        if (this.dataType.toLowerCase().includes('varchar')) {
            return "''"
        }
        if (this.dataType == 'DATETIME') return '1753-01-01'
        if (this.dataType == 'SMALLDATETIME') return '1900-01-01'
        if (this.dataType.includes('DATE')) return '0001-01-01'

        return ''
    }

    createSQL() {

        let sql = `${this.name} `

        if (this.modifiedName != "") {
            sql += " " + this.modifiedName + " "
        }
        sql += ` ${this.dataType} `
        if (!this.isNullable) sql += 'NOT NULL '
        if (this.isPrimaryKey) {
            let autoIncrementStr = 'AUTO_INCREMENT';
            if (Table.dialect == 'mssql') {
                autoIncrementStr = 'IDENTITY(1,1)';
            }
            sql += `PRIMARY KEY ${autoIncrementStr}  `
        }
        if (this.isUnique) {
            sql += 'UNIQUE '
        }
        if (this.defaultValue != "") {
            sql += `DEFAULT ${this.defaultValue}`
        }
        else {
            if (!this.isNullable) {
                if (Table.dialect == 'mssql') {
                    sql += `DEFAULT ${this.getDefaultValueForMsSql()}`
                }
                else if (Table.dialect == 'mysql') {
                    sql += `DEFAULT ${this.getDefaultValueForMySql()}`
                }

            }
        }
        return sql

    }

    createAddSQL() {
        return `ADD ${Table.dialect == 'mysql' ? 'COLUMN' : ' '} ${this.createSQL()}`
    }
    createUpdateSQL() {
        if (this.isDefaultValueSet) {
            return `ALTER COLUMN ${this.name} set DEFAULT "${this.defaultValue}"`
        }
        let beginStatement = "CHANGE COLUMN ";
        if (Table.dialect == 'mssql') {
            beginStatement = "ALTER COLUMN ";
        }
        return beginStatement + this.createSQL()
    }
}
class Table {

    mySqlManager = {};
    dbName = "";
    columns = [];
    alteredName = "";
    columnsToRemove = []
    foreignKeys = []
    foreignKeyObjs = []
    columnsToUpdate = []
    columnsToRename = []
    nameOfcolumnsToRename = []
    nameOfcolumnsToRemove = []
    foreignKeysToDrop = []
    foreignKeyObjsToDrop = []
    name = "";

    dbHandler = {};

    static dialect = 'mysql';
    static isDisperseMode = false;

    rename(newName) {
        this.alteredName = newName;
        return this;
    }

    /**
     * 
     * @param {String} columnName 
     * @returns {Column}
     */
    addColumn(columnName, dataType) {
        let newColumn = new Column(columnName)
        this.columns.push(newColumn)
        newColumn.setDataType(dataType)
        return newColumn
    }
    addForeignKey(columnName, refTable, refColumn, keyName = "") {
        this.foreignKeyObjs.push({ columnName, refTable, refColumn, keyName, srcTable: this.name })
        this.foreignKeys.push(` CONSTRAINT fk_${this.name}_${columnName}  FOREIGN KEY (${columnName}) REFERENCES  ${refTable}(${refColumn}) `)
    }
    dropColumn(columnName) {
        this.nameOfcolumnsToRemove.push(columnName)
        this.columnsToRemove.push(`drop column  ${columnName}`);
    }

    async dropForeignKey(keyName) {
        this.foreignKeyObjsToDrop.push(keyName)
        let command = `DROP FOREIGN KEY fk_${this.name}_${keyName}`;
        if (Table.dialect == 'mssql') {

            let query = `
                use ${this.dbName};
                SELECT 
                    fk.name AS ConstraintName,t_parent.name,c_parent.name,t_ref.name
                FROM sys.foreign_keys AS fk
                INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
                INNER JOIN sys.tables AS t_parent ON fkc.parent_object_id = t_parent.object_id
                INNER JOIN sys.columns AS c_parent ON fkc.parent_object_id = c_parent.object_id 
                    AND fkc.parent_column_id = c_parent.column_id
                INNER JOIN sys.tables AS t_ref ON fkc.referenced_object_id = t_ref.object_id
                WHERE t_parent.name = '${this.name}'
                AND c_parent.name = '${keyName}'
                
                `;
            let [{ ConstraintName }] = await singletonMsSqlManagerObj.executeSqlAsync({ sql: query });
            if (ConstraintName == null) {
                throw new Error(`Foreign key not found in ${this.name}-${keyName}`);
            }

            command = `DROP constraint ${ConstraintName}`
        }

        this.foreignKeysToDrop.push(command)
    }

    constructor(tableName) {

        this.name = tableName
        this.columns = []
        this.newlyAddedColumns = [];
        this.dbHandler = new MySqlDbConnection();
        if (Table.dialect == 'mssql') this.dbHandler = singletonMsSqlManagerObj;
    }
    async executeSql(sql) {
        try {
            await this.dbHandler.executeSqlAsync({ sql })
        } catch (error) {
            console.log(error)
        }

    }
    toString() {
        return { name: this.name, columns: this.columns }
    }
    /**
     * 
     * @param {Table} table 
     */
    compare(table) {
        let newCols = Table.findNonExistentCols(this, table);
        let newFKeys = Table.findNonExistentFkeys(this, table);
        let colsToDelete = Table.findNonExistentCols(table, this);
        let fkeysToDelete = Table.findNonExistentFkeys(table, this);
        return { newCols, newFKeys, colsToDelete, fkeysToDelete };
    }
    /**
     * 
     * @param {Table} src 
     * @param {Table} dest 
     */
    static findNonExistentCols(src, dest) {
        let newCols = [];
        src.columns.forEach(col => {
            let otherTableCol = dest.columns.filter(x => x.name == col.name && x.dataType == col.dataType)[0];
            if (!otherTableCol) newCols.push({ ...col, tableName: src.name });

        });
        return newCols;
    }
    /**
     * 
     * @param {Table} src 
     * @param {Table} dest 
     */
    static findNonExistentFkeys(src, dest) {
        let newFKeys = [];

        src.foreignKeyObjs.forEach(fkey => {
            let otherTableFkey = dest.foreignKeyObjs.filter(x => x.columnName == fkey.columnName)[0];
            if (!otherTableFkey) {
                newFKeys.push({ ...fkey, tableName: src.name });
            }
        });
        return newFKeys;
    }

    async drop() {
        let previousState = await this.getPreviousSchema()
        this.executeSql(`DROP TABLE ${this.name};`)
        return JSON.stringify({
            "case": "drop",
            "table": this.name,
            structure: { ...previousState }
        })
    }
    async create() {


        let sql = `create table ${Table.dialect == 'mysql' ? ' if not exists ' : ''}  ${this.name}(
            ${this.columns.map(column => {
            return column.createSQL()
        }).join(',')}
        ${this.columns.length > 0 && this.foreignKeys.length > 0 ? ',' : ''}
        ${this.foreignKeys.join(',')}
        );`
        await this.executeSql(sql)
        return JSON.stringify({
            "case": "create",
            "table": this.name
        })
    }


    createTableStructure(tableInfo, foreignKeys) {
        tableInfo.forEach(col => {
            let newColumn = new Column(col.Field)
            if (col.Key == 'PRI') {

                this.setID(col.Field)
                return

            }
            this.columns.push(newColumn)
            let type = col.Type.toUpperCase() + ""
            if (type.startsWith('TEXT') || type.startsWith('LONGTEXT'))
                type = 'TEXT(65536)'
            newColumn.setDataType(type)
                .setDefaultValue(col.Detault)
                .setUnique(col.Key == 'UNI')
            if (col['Default'] != null) newColumn.setDefaultValue(col['Default']);
            newColumn.isNullable = false;
            if (col.Null == 'YES') newColumn.setNullable();

        })
        foreignKeys.forEach(fkey => {
            this.addForeignKey(fkey.source_column, fkey.target_table, fkey.target_column, fkey.cname)
        })
    }

    /**
     * 
     * @param {[any]} tableInfo 
     * @param {[any]} foreignKeys 
     */
    createMigrationFileText(tableInfo, foreignKeys) {
        this.createTableStructure(tableInfo, foreignKeys);
        return this.getMigrationFileTextUtil()
    }
    getMigrationFileTextUtil() {
        let text = `const {Table} = require('migratify/templates/Migration.class')\nlet newTable = new Table("${this.name}");\n`;

        this.columns.forEach((col) => {
            if (col.isPrimaryKey) {
                let descText = `newTable.setID('${col.name}');\n`
                text += descText
                return
            }
            let descText = `newTable.addColumn('${col.name}','${col.dataType}')\n`
            descText += `\t.setNullable(${col.isNullable})\n`
            descText += `\t .setDefaultValue('${col.defaultValue}')\n`
            descText += `\t .setUnique(${col.isUnique})\n`
            text += descText
        })
        let uniqueForeignKeys = new Set()
        this.foreignKeyObjs.forEach(fkey => {
            uniqueForeignKeys.add(JSON.stringify(fkey))
        })
        this.foreignKeyObjs = Array.from(uniqueForeignKeys)
        this.foreignKeyObjs.forEach(fkey => {
            let { columnName, refTable, refColumn } = JSON.parse(fkey)
            let descText = `newTable.addForeignKey('${columnName}','${refTable}','${refColumn}');\n`
            text += descText
        })
        text += `module.exports = async () => {\n\treturn newTable.create()\n}`
        return text
    }
    appendedList = []
    appendAndCompare(list) {
        let isFound = 0
        for (let list of this.appendedList) {
            if (list.length > 0) {
                isFound = 1;
                break
            }
        }
        this.appendedList.push(list)
        return isFound == 1 & list.length > 0
    }


    async updateTableForMsSql() {
        let changes = await this.getChanges()

        for (const colToUpdate of this.columnsToUpdate) {
            let alterSql = `alter table ${this.name} alter column ${colToUpdate.name} ${colToUpdate.dataType} ${colToUpdate.isNullable ? "NULL" : "Not null"} `;
            await this.executeSql(alterSql);
        }

        for (let colToAdd of this.columns) {
            let alterSql = `alter table ${this.name} ${colToAdd.createAddSQL()} `;
            await this.executeSql(alterSql);

        }

        let colsForRenaming = this.columnsToUpdate.filter(x => x.modifiedName != "");
        for (const colForRenaming of colsForRenaming) {
            let renameSql = `EXEC sp_rename '${this.name}.${colForRenaming.name}', '${colForRenaming.modifiedName}', 'COLUMN'`;
            await this.executeSql(renameSql);
        }

        if (this.nameOfcolumnsToRemove.length > 0) {
            let namesJoined = this.nameOfcolumnsToRemove.join(',');
            let dropColSql = `alter table ${this.name} drop column ${namesJoined}`;
            await this.executeSql(dropColSql);
        }
        for (const fkey of this.foreignKeys) {
            let addFkeyQuery = `alter table ${this.name} add ${fkey};`
            await this.executeSql(addFkeyQuery);
        }

        for (const fkeyToDrop of this.foreignKeysToDrop) {
            let dropFkeyQuery = `alter table ${this.name}   ${fkeyToDrop};`
            await this.executeSql(dropFkeyQuery);
        }

        return changes;
    }

    async update() {

        if (Table.dialect == 'mysql') {
            this.appendedList.push(this.columns)
            let sql = `alter table ${this.name}
            ${this.alteredName ? 'rename to ' + this.alteredName : ''}
             ${this.columns.map((column) =>
                column.createAddSQL()).join(',')}
            ${this.appendAndCompare(this.columnsToRemove) ? ',' : ' '}
            
            ${this.columnsToRemove.join(',')}
            
            ${this.appendAndCompare(this.columnsToUpdate) ? ',' : ' '}

             ${this.columnsToUpdate.map((column) =>
                    column.createUpdateSQL()).join(',')}
            ${this.appendAndCompare(this.foreignKeys) ? ',' : ' '}

            ${this.foreignKeys.map((foreignKey, index) => `${index == 0 ? 'ADD ' : (Table.dialect == 'mysql' ? 'ADD ' : ' ')} ${foreignKey}`).join(',')}

            ${this.appendAndCompare(this.columnsToRename) ? "," : " "}
            
            ${this.columnsToRename.join(',')}

            ${this.appendAndCompare(this.foreignKeysToDrop) ? "," : " "}
            ${this.foreignKeysToDrop.join(',')}  ; `
            let changes = await this.getChanges()
            await this.executeSql(sql);
            return changes;
        }
        else if (Table.dialect == 'mssql') {

            return this.updateTableForMsSql();
        }



    }
    async getPreviousSchema() {
        if (Table.isDisperseMode) return null;
        const env = require(process.cwd() + '/migrations/config.json')

        let schema = await this.dbHandler.executeSqlAsync({
            sql: `DESCRIBE ${this.name};`,
            values: []
        })
        let _schema = {}
        for (let col of schema) {
            _schema[col.Field] = col
        }
        let foreignKeys = await this.dbHandler.executeSqlAsync({
            sql: `SELECT
                con.table_name AS source_table,
                con.referenced_table_name AS target_table,
                col.column_name AS source_column,
                col.referenced_column_name AS target_column
                
            FROM
                information_schema.key_column_usage AS col
                JOIN information_schema.referential_constraints AS con ON col.constraint_name = con.constraint_name
            WHERE
                col.table_schema = '${env.dbName}'
                AND col.table_name = '${this.name}';`
        })
        let uniqueKeySet = {}
        for (let key of foreignKeys) {
            uniqueKeySet[JSON.stringify(key)] = key
        }
        let uniqueKeys = {}
        for (let key in uniqueKeySet) uniqueKeys[`fk_${this.name}_${uniqueKeySet[key].target_table}`] = (uniqueKeySet[key])

        return { schema: _schema, foreignKeys: uniqueKeys }
    }
    async getChanges() {
        if (Table.isDisperseMode) return null;

        let { schema, foreignKeys } = await this.getPreviousSchema()
        let addedColumns = this.columns

        let alteredColumns = []
        for (let alteredColumn of [...this.columnsToUpdate]) {
            alteredColumns.push({ ...schema[alteredColumn], "newName": alteredColumn.name })
        }
        for (let alteredColumn of [...this.nameOfcolumnsToRename]) {
            alteredColumns.push({ ...schema[alteredColumn.oldName], "newName": alteredColumn.newName })
        }
        let deletedColumns = []
        for (let deletedColumn of this.nameOfcolumnsToRemove) {
            deletedColumns.push(schema[deletedColumn])
        }
        let addedForeignKeys = this.foreignKeyObjs

        let deletedForeignKeys = []
        for (let deletedForeignKey of this.foreignKeyObjsToDrop) {
            deletedForeignKeys.push(foreignKeys[`fk_${this.name}_${deletedForeignKey}`])
        }
        return JSON.stringify({
            "case": "update",
            "table": this.name,
            "changes": {
                addedColumns, alteredColumns, deletedColumns, addedForeignKeys, deletedForeignKeys
            }
        })
    }
    renameColumn(oldName, newName) {
        this.nameOfcolumnsToRename.push({ oldName, newName })
        this.columnsToRename.push(`RENAME COLUMN ${oldName} TO ${newName}`)
    }
    setID(idName) {
        let column = new Column(idName)
        this.columns.push(column)
        column.setPrimaryKey(true)
        column.setDataType('int')
    }


    updateExistingColumn(columnName) {
        let column = new Column(columnName)
        this.columnsToUpdate.push(column)
        return column
    }
}




module.exports = { Table, Column }