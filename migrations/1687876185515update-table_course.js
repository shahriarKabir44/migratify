const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.addColumn('credit', 'int')
newTable.update()