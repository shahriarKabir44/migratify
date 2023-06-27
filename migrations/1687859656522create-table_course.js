const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.setID('id')

newTable.addProperty('studentId', 'int').setNullable('false')

newTable.addProperty('title', 'int')

newTable.create()