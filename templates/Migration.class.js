const { DBConnection } = require("../utils/dbConnection")
const fs = require('fs')
const path = require('path')
class Column {
    name = ""
    dataType = ""
    defaultValue = ""
    isNullable = true
    isPrimaryKey = false
    isAutoIncrement = false
    isUnique = false
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
        this.defaultValue = defaultValue
        return this
    }

    createSQL() {

        let sql = `${this.name} ${this.dataType} `
        if (!this.isNullable) sql += 'NOT NULL '
        if (this.isPrimaryKey) {
            sql += 'PRIMARY KEY AUTO_INCREMENT '
        }
        if (this.isUnique) {
            sql += 'UNIQUE '
        }
        if (this.defaultValue != "") {
            sql += `DEFAULT '${this.defaultValue}'`
        }
        return sql

    }
}
class Table {
    columns = []
    columnsToRemove = []
    foreignKeys = []
    foreignKeyObjs = []
    columnsToUpdate = []
    columnsToRename = []
    nameOfcolumnsToRename = []
    nameOfcolumnsToRemove = []
    foreignKeysToDrop = []
    foreignKeyObjsToDrop = []
    name = ""
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
    addForeignKey(columnName, refTable, refColumn) {
        this.foreignKeyObjs.push({ columnName, refTable, refColumn })
        this.foreignKeys.push(` CONSTRAINT fk_${this.name}_${columnName}  FOREIGN KEY (${columnName}) REFERENCES  ${refTable}(${refColumn}) `)
    }
    dropColumn(columnName) {
        this.nameOfcolumnsToRemove.push(columnName)
        this.columnsToRemove.push(`drop column  ${columnName}`);
    }

    dropForeignKey(keyName) {
        this.foreignKeyObjsToDrop.push(keyName)
        this.foreignKeysToDrop.push(`DROP FOREIGN KEY fk_${this.name}_${keyName}`)
    }

    constructor(tableName) {

        this.name = tableName
        this.columns = []
        this.newlyAddedColumns = []
    }
    static async executeSql(sql) {
        try {
            await DBConnection.executeSqlAsync({ sql })
        } catch (error) {
            console.log(error)
        }

    }

    async drop() {
        let previousState = await this.getPreviousSchema()
        Table.executeSql(`DROP TABLE ${this.name};`)
        return JSON.stringify({
            "case": "drop",
            "table": this.name,
            structure: { ...previousState }
        })
    }
    async create() {
        let sql = `create table if not exists ${this.name}(
            ${this.columns.map(column => {
            return column.createSQL()
        }).join(',')}
        ${this.columns.length > 0 && this.foreignKeys.length > 0 ? ',' : ''}
        ${this.foreignKeys.join(',')}
        );`
        await Table.executeSql(sql)
        return JSON.stringify({
            "case": "create",
            "table": this.name
        })
    }
    /**
     * 
     * @param {[any]} tableInfo 
     * @param {[any]} foreignKeys 
     */
    createMigrationFileText(tableInfo, foreignKeys) {
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
            if (col['Default'] != null) newColumn.setDefaultValue(col['Default'])
            if (col.Null == 'YES') newColumn.setNullable()
        })
        foreignKeys.forEach(fkey => {
            this.addForeignKey(fkey.source_column, fkey.target_table, fkey.target_column)
        })
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
    async update() {
        this.appendedList.push(this.columns)
        let sql = `alter table ${this.name} ${this.columns.map((column) =>
            'ADD COLUMN  ' + column.createSQL()).join(',')}
            ${this.appendAndCompare(this.columnsToRemove) ? ',' : ' '}
            
            ${this.columnsToRemove.join(',')}
            
            ${this.appendAndCompare(this.columnsToUpdate) ? ',' : ' '}

             ${this.columnsToUpdate.map((column) =>
                'MODIFY ' + column.createSQL()).join(',')}
            ${this.appendAndCompare(this.foreignKeys) ? ',' : ' '}

            ${this.foreignKeys.map(foreignKey => `ADD ${foreignKey}`).join(',')}

            ${this.appendAndCompare(this.columnsToRename) ? "," : " "}
            
            ${this.columnsToRename.join(',')}

            ${this.appendAndCompare(this.foreignKeysToDrop) ? "," : " "}
            ${this.foreignKeysToDrop.join(',')}  ; `
        let changes = await this.getChanges()
        await Table.executeSql(sql)
        return changes

    }
    async getPreviousSchema() {
        const env = require(process.cwd() + '/migrations/config.json')

        let schema = await DBConnection.executeSqlAsync({
            sql: `DESCRIBE ${this.name};`,
            values: []
        })
        let _schema = {}
        for (let col of schema) {
            _schema[col.Field] = col
        }
        let foreignKeys = await DBConnection.executeSqlAsync({
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




module.exports = { Table }