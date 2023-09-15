
const executeSqlAsync = require('../utils/promisify')

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
        this.isNullable = false
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
        this.foreignKeys.push(`   FOREIGN KEY (${columnName}) REFERENCES  ${refTable}(${refColumn}) `)
    }
    removeProperty(columnName) {
        this.columns = this.columns.filter(column => column.name = columnName)
        this.columnsToRemove.push(`drop column if exists ${columnName}`);
    }

    constructor(tableName) {
        this.name = tableName
        this.columns = []
        this.newlyAddedColumns = []
    }
    static async executeSql(sql) {
        try {
            let result = await executeSqlAsync({
                sql
            })
        } catch (error) {
            console.log(error)
        }

    }
    static async drop() {
        return Table.executeSql(`DROP TABLE ${this.name};`)
    }
    create() {
        let sql = `create table if not exists ${this.name}(
            ${this.columns.map(column => {
            return column.createSQL()
        }).join(',')}
        ${this.columns.length > 0 && this.foreignKeys.length > 0 ? ',' : ''}
        ${this.foreignKeys.join(',')}
        );`
        return Table.executeSql(sql)
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
            console.log(type)
            if (type.startsWith('TEXT') || type.startsWith('LONGTEXT'))
                type = 'TEXT(65536)'
            newColumn.setDataType(type)
                .setNullable(col.Null == 'YES')
                .setDefaultValue(col.Detault)
                .setUnique(col.Key == 'UNI')
        })
        foreignKeys.forEach(fkey => {
            this.addForeignKey(fkey.source_column, fkey.target_table, fkey.target_column)
        })
        return this.getMigrationFileTextUtil()
    }
    getMigrationFileTextUtil() {
        let text = `const {Table} = require('../templates/Migration.class')\nlet newTable = new Table("${this.name}");\n`;

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
        this.foreignKeyObjs.forEach(fkey => {
            let { columnName, refTable, refColumn } = fkey
            let descText = `newTable.addForeignKey('${columnName}','${refTable}','${refColumn}');\n`
            text += descText
        })
        text += `module.exports = async () => {\n\tnewTable.create()\n}`
        return text
    }
    update() {
        let sql = `alter table ${this.name} ${this.columns.map((column) =>
            'ADD COLUMN  ' + column.createSQL()).join(',')}
            ${this.columnsToRemove.length > 0 && this.columns.length > 0 ? ',' : ' '}
            
            ${this.columnsToRemove.join(',')}
            
            ${(this.columnsToRemove.length > 0 ||
                this.columns.length > 0) &&
                this.columnsToUpdate.length > 0
                ? ',' : ' '}

             ${this.columnsToUpdate.map((column) =>
                    'MODIFY ' + column.createSQL()).join(',')}
            ${(this.columnsToRemove.length > 0 ||
                this.columns.length > 0 ||
                this.columnsToUpdate.length > 0) &&
                this.foreignKeys.length > 0
                ? ',' : ' '}
            ${this.foreignKeys.map(foreignKey => `ADD ${foreignKey}`).join(',')}
            ${(this.columnsToRemove.length > 0 ||
                this.columns.length > 0 ||
                this.columnsToUpdate.length > 0 ||
                this.foreignKeys.length > 0) &&
                this.columnsToRename.length > 0 ? "," : " "}
            ${this.columnsToRename.join(',')}
            ; `
        return Table.executeSql(sql)

    }
    renameColumn(oldName, newName) {
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