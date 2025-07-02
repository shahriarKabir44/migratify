const { MySqlDbConnection } = require("../utils/mysql/MySqlDbConnection")


async function dropTable(table) {
    var mySqlManager = new MySqlDbConnection()
    return mySqlManager.executeSqlAsync({
        sql: `DROP TABLE ${table};`,
        values: []
    })
}

module.exports = { dropTable }