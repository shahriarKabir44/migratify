const { Table } = require('../templates/Migration.class')

let newTable = new Table("abcdd")
newTable.updateAddProperty("kuddus").setDataType('int')
newTable.update()