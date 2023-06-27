const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.updateExistingColumn('title', 'varchar(255)')
newTable.update()