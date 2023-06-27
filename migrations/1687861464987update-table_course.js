const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.updateExistingColumn('title').setDataType('varchar(255)')
newTable.update()