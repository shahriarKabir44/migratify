
const executeSqlAsync = require('../utils/promisify')
const { connectionObject, initConnection } = require('../utils/dbConnection')
require('dotenv').config()

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
    removeProperty(columnName) {
        this.columns = this.columns.filter(column => column.name = columnName)
        this.columnsToRemove.push(`drop column ${columnName}`);
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
            initConnection(process.env)
            let result = await executeSqlAsync({
                sql
            })
            console.log(result)
        } catch (error) {
            console.log(error)
        }

        connectionObject.connection.end()
    }
    create() {
        let sql = `create table if not exists ${this.name}(
            ${this.columns.map(column => {
            return column.createSQL()
        }).join(',')}
        );`
        Table.executeSql(sql)
    }
    update() {
        let sql = `alter table ${this.name} ${this.newlyAddedColumns.map((column) =>
            'ADD COLUMN ' + column.createSQL()).join(',')}
            ${this.columnsToRemove.length > 0 && this.newlyAddedColumns.length > 0 ? ',' : ' '}
            ${this.columnsToRemove.join(',')}; `
        Table.executeSql(sql)

    }
    setID(idName) {
        let column = new Column(idName)
        this.columns.push(column)
        column.setPrimaryKey(true)
        column.setDataType('int')
    }
}




module.exports = { Table }