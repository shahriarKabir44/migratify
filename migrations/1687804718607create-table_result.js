const { Table } = require('../templates/Migration.class')

let newTable = new Table("result")
newTable.setID('id')
newTable.addProperty('examineeId').setDataType('int').setNullable(false)
newTable.addProperty('title').setDataType('varchar(255)');
newTable.setForeignKey('examineeId', 'person', 'id')
newTable.create()