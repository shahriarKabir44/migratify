const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.setID('id')

newTable.addProperty('studentId').setDataType('int').setNullable('false')

newTable.addProperty('title').setDataType('int')

newTable.create()