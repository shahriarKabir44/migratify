const { DBConnection } = require("../utils/dbConnection");



async function revertUpdates(changes, tableName) {
    let promises = []
    let dropColumnsSQL = `ALTER TABLE ${tableName} ` +
        changes.addedColumns.map(addedColumn => `DROP COLUMN ${addedColumn.name}`).join(',') + ";";
    promises.push(DBConnection.executeSqlAsync({
        sql: dropColumnsSQL,
        values: []
    }))


    let addColumnsSQL = `ALTER TABLE  ${tableName} ` +
        changes.deletedColumns.map(deletedColumn => {
            return `ADD COLUMN ${deletedColumn.Field} ${deletedColumn.Type} 
            ${deletedColumn.Null.toLowerCase() == 'yes' ? '' : 'NOT NULL'}
            ${deletedColumn.Default == null ? '' : `Default ${deletedColumn.Default}`}
        `
        }).join(',') + ";"
    promises.push(DBConnection.executeSqlAsync({
        sql: addColumnsSQL,
        values: []
    }))

    let dropForeignKeysSQL = `ALTER TABLE ${tableName} ` +
        changes.addedForeignKeys.map(addedForeignKey => {
            return ` DROP FOREIGN KEY fk_${tableName}_${addedForeignKey.refTable}`
        }).join(',') + ";";
    promises.push(DBConnection.executeSqlAsync({
        sql: dropForeignKeysSQL,
        values: []
    }))
    let addForeignKeySQL = `ALTER TABLE ${tableName} ` +
        changes.deletedForeignKeys.map(deletedForeignKey => {
            return ` ADD CONSTRAINT fk_${tableName}_${deletedForeignKey.target_table}
                    FOREIGN KEY (${deletedForeignKey.source_column}) REFERENCES ${deletedForeignKey.target_table}(${deletedForeignKey.target_column})`
        }).join(' ') + ';';
    promises.push(DBConnection.executeSqlAsync({
        sql: addForeignKeySQL,
        values: []
    }))


    let modifyColumnsSQL = `ALTER TABLE ${tableName} ` +
        changes.alteredColumns.map(alteredColumn => {
            if (alteredColumn.Field != alteredColumn.newName)
                return `RENAME COLUMN ${alteredColumn.newName} TO ${alteredColumn.Field}`

            return `ALTER COLUMN ${alteredColumn.Field} ${alteredColumn.Type} 
            ${alteredColumn.Null.toLowerCase() == 'yes' ? '' : 'NOT NULL'}
            ${alteredColumn.Default == null ? '' : `Default ${alteredColumn.Default}`}`
        }).join(',') + ';';
    promises.push(DBConnection.executeSqlAsync({
        sql: modifyColumnsSQL,
        values: []
    }))

    return Promise.all(promises)

}

module.exports = { revertUpdates }