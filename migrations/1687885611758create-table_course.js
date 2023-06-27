const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")

newTable.setID('id')
newTable.addColumn('title', 'varchar(255)')
newTable.addColumn('takenBy', 'int')
newTable.addForeignKey('takenBy', 'teacher', 'id')

module.exports = async () => {
    newTable.create()
}