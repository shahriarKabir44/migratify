
const executeSqlAsync = require('../utils/promisify')

class Column {
    name = ""
    dataType = ""
    defaultValue = ""
    isNullable = true
    isPrimaryKey = false
    isAutoIncrement = false
    isUnique = false
    setPrimaryKey(flag = false) {
        this.isPrimaryKey = flag
        if (flag) {
            this.isAutoIncrement = true
            this.isNullable = false
        }
    }
    setUnique(flag = false) {
        this.isUnique = flag
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
    newlyAddedColumns = []
    columnsToRemove = []
    foreignKeys = []
    columnsToUpdate = []
    name = ""
    /**
     * 
     * @param {String} columnName 
     * @returns {Column}
     */
    addProperty(columnName) {
        let newColumn = new Column(columnName)
        this.columns.push(newColumn)
        return newColumn
    }
    setForeignKey(columnName, refTable, refColumn) {
        this.foreignKeys.push(`   FOREIGN KEY (${columnName}) REFERENCES  ${refTable}(${refColumn}) `)
    }
    removeProperty(columnName) {
        this.columns = this.columns.filter(column => column.name = columnName)
        this.columnsToRemove.push(`drop column if exists ${columnName}`);
    }
    updateAddProperty(
        newPropertyName
    ) {
        let newColumn = new Column(newPropertyName)
        this.newlyAddedColumns.push(newColumn)
        return newColumn
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
    create() {
        let sql = `create table if not exists ${this.name}(
            ${this.columns.map(column => {
            return column.createSQL()
        }).join(',')}
        ${this.columns.length > 0 && this.foreignKeys.length > 0 ? ',' : ''}
        ${this.foreignKeys.join(',')}
        );`
        Table.executeSql(sql)
    }
    update() {
        let sql = `alter table ${this.name} ${this.newlyAddedColumns.map((column) =>
            'ADD COLUMN  ' + column.createSQL()).join(',')}
            ${this.columnsToRemove.length > 0 && this.newlyAddedColumns.length > 0 ? ',' : ' '}
            
            ${this.columnsToRemove.join(',')}
            
            ${(this.columnsToRemove.length > 0 ||
                this.newlyAddedColumns.length > 0) &&
                this.columnsToUpdate.length > 0
                ? ',' : ' '}

             ${this.columnsToUpdate.map((column) =>
                    'MODIFY ' + column.createSQL()).join(',')}
            
            ; `
        Table.executeSql(sql)

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