const { Table } = require('../templates/Migration.class')

let newTable = new Table("person")
newTable.setID('id')
newTable.addProperty('address').setDataType('varchar(255)')
newTable.addProperty('email').setDataType('varchar(255)').setUnique(true)
newTable.create()