const {Table} = require('../templates/Migration.class')

let newTable = new Table("course")

module.exports = async () => {
    newTable.drop()
}