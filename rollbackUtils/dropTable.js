
const { DBConnection } = require('../utils/dbConnection')

async function dropTable(table) {
    return DBConnection.executeSqlAsync({
        sql: `DROP TABLE ${table};`,
        values: []
    })
}

module.exports = { dropTable }