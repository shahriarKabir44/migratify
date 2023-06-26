const { Table } = require('../templates/Migration.class')

let newTable = new Table("abcdd")

newTable.setID('id')

newTable.addNewProperty('name').setDataType('varchar(255)').setDefaultValue('kuddus')



newTable.create()