const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.addColumn('title', 'varchar(255)')
newTable.addColumn('takenBy', 'int')

newTable.create()