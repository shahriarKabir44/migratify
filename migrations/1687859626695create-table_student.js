const { Table } = require('../templates/Migration.class')

let newTable = new Table("student")
newTable.setID('id')
newTable.addProperty('name', 'varchar(255)').setNullable(false)
newTable.addProperty('email', 'varchar(255)').setUnique(true)
newTable.create()