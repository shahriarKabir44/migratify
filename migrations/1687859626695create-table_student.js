const { Table } = require('../templates/Migration.class')

let newTable = new Table("student")
newTable.setID('id')
newTable.addProperty('name').setDataType('varchar(255)').setNullable(false)
newTable.addProperty('email').setUnique(true).setDataType('varchar(255)')
newTable.create()