const { Table } = require('../templates/Migration.class')

let newTable = new Table("teacher")

newTable.setID('id')

newTable.addColumn('name', 'varchar(255)')

newTable.addColumn('address', 'varchar(255)')


module.exports = async () => {
    newTable.create()
}