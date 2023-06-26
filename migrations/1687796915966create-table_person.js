const { Table } = require('../templates/Migration.class')

let newTable = new Table("person")
newTable.setID('id')

newTable.addProperty('fk').setDataType('int')

newTable.setForeignKey('fk', 'abcdd', 'id')

newTable.create()