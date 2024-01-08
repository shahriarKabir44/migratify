const { Table } = require("../templates/Migration.class");
function createTable(tableName, { schema, foreignKeys }) {
    const newTable = new Table(tableName)
    for (const key in schema) {
        let col = schema[key]
        if (col['Key'].toLowerCase() == 'pri') {
            newTable.setID(col['Field'])
            continue
        }
        let newCol = newTable.addColumn(col['Field'], col['Type'])

            .setNullable(col['Null'].toLowerCase() != 'no')
        if (col['Default'] != null) newCol.setDefaultValue(col['Default'])
    }
    for (const foreignKey in foreignKeys) {
        const { target_table, source_column, target_column } = foreignKeys[foreignKey]
        newTable.addForeignKey(source_column, target_table, target_column)
    }
    return newTable.create()
}

module.exports = { createTable }