const { Table } = require('../templates/Migration.class')

let newTable = new Table("student")
newTable.setID('id')
newTable.addColumn('name', 'varchar(255)')
newTable.addColumn('email', 'varchar(255)').setUnique(true)

newTable.create()