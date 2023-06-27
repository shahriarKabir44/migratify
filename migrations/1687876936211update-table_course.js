const { Table } = require('../templates/Migration.class')

let newTable = new Table("course")
newTable.addForeignKey('takenBy', 'student', 'id')

newTable.update()