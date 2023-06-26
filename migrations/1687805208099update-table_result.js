const { Table } = require('../templates/Migration.class')

let newTable = new Table("result")
newTable.updateAddProperty('examName').setDataType('varchar(255)')
newTable.updateExistingColumn('title').setDataType('int').setDefaultValue('33')
newTable.update()