const { Table } = require('../templates/Migration.class')

let newTable = new Table("abcdd")
newTable.setID('id')
newTable.addProperty('name').setDataType('varchar(255)')
newTable.create()