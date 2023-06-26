const { connectionObject } = require('./dbConnection')

const executeSqlAsync = function ({ sql, values }) {
    return new Promise(function (resolve, reject) {
        connectionObject.connection.query({
            sql, values
        }, (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })
}

module.exports = executeSqlAsync