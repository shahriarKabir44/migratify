const { Table, Column } = require("../templates/Migration.class");
const { DBConnection } = require("../utils/dbConnection");
const readline = require('readline');

class Database {
    Tables = [];
    Name = "";
    credential = {};
    static isDisposeReadline = true;
    static readlineObj = null;
    /**
     *
     */
    constructor(rawData, credential) {
        this.credential = credential;
        this.Name = rawData.dbName;
        rawData.tableDataList.forEach(table => {
            let newTable = new Table(table.tableName);
            let { cols, fkeys } = table;
            newTable.createTableStructure(cols, fkeys);
            this.Tables.push(newTable);
        });
    }

    /**
     * 
     * @param {Database} srcDb 
     */
    compare(srcDb) {
        let newCols = [];
        let newForeignKeys = [];
        let addedTables = [];
        let colsToDelete = [];
        let fkeysToDelete = [];
        let tablesToDelete = [];

        this.Tables.forEach(table => {

            let srcTable = srcDb.Tables.filter(x => x.name == table.name)[0];
            if (!srcTable) {
                fkeysToDelete = [...fkeysToDelete, ...table.foreignKeyObjs.map(x => {
                    return { ...x, tableName: table.name }
                })]
                tablesToDelete.push(table);
                return;
            }
            let comparison = table.compare(srcTable);
            colsToDelete = [...colsToDelete, ...comparison.newCols];

            fkeysToDelete = [...fkeysToDelete, ...comparison.newFKeys];



        });

        srcDb.Tables.forEach(table => {
            let existing = this.Tables.filter(x => x.name == table.name)[0];
            if (existing == null) {
                newForeignKeys = [...newForeignKeys, ...table.foreignKeyObjs.map(x => {
                    return { ...x, tableName: table.name }
                })]

                addedTables.push(table);
                return;
            }
            let comparison = table.compare(existing);
            newCols = [...newCols, ...comparison.newCols];

            newForeignKeys = [...newForeignKeys, ...comparison.newFKeys];
        });

        return {
            newCols, newForeignKeys, addedTables, colsToDelete, fkeysToDelete, tablesToDelete
        }

    }


    /**
     * 
     * @param {Database} srcDb 
     */
    async executeDifferences(srcDb) {
        let { newCols, newForeignKeys, addedTables, colsToDelete, fkeysToDelete, tablesToDelete } = this.compare(srcDb);
        DBConnection.credential = this.credential;
        //await DBConnection.initConnection();
        await DBConnection.beginTransaction();
        Table.isDisperseMode = true;
        console.log(`=======================================================================`);
        console.log(`Processing database: ${this.Name}`);
        const rl = Database.readlineObj ?? readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        async function takeInput(question) {
            question += ": "
            return new Promise((resolve, reject) => {
                rl.question(question, (data) => {
                    resolve(data)
                });
            })
        }

        srcDb.fkeys = [];
        for (let item of [...srcDb.Tables.map(x => x.foreignKeyObjs)]) {
            srcDb.fkeys = [...srcDb.fkeys, ...item]

        }
        this.fkeys = [];
        for (let item of [...this.Tables.map(x => x.foreignKeyObjs)]) {
            this.fkeys = [...this.fkeys, ...item]

        }
        DBConnection.ShouldCloseConnectionNow = false;
        try {

            //#region determine cols to drop and modify
            let colsToRename = [];

            let colsNotToDelete = [];
            for (let colToDelete of colsToDelete) {
                let question = (`The Column ${colToDelete.name} ${colToDelete.dataType} ${colToDelete.isNullable ? "Nullable" : "Not Nullable"} is not found on the source table ${colToDelete.tableName}!\n1=>Drop it\n2=>Modify It\nDefault: Keep it`);
                let task = await takeInput(question);
                if (task * 1 != 1 && task * 1 != 2) continue;

                if (task * 1 == 1) {

                    for (let thisTableFkey of this.fkeys) {
                        if (thisTableFkey.source_column == colToDelete.name || thisTableFkey.target_column == colToDelete.name) {
                            if (!fkeysToDelete.filter(x => x.source_column == thisTableFkey.source_column
                                && x.target_column == thisTableFkey.target_column
                            )[0]) {
                                fkeysToDelete.push(thisTableFkey);
                            }
                        }
                    }

                }
                else if (task * 1 == 2) {
                    let newName = await takeInput("Please Provide the New Name! Leave blank if unchanged");

                    let newDataType = await takeInput("Please Provide the Data Type! Leave blank if unchanged");
                    let newIsNullable = (await takeInput("Nullable? (1/0) Leave blank if unchanged"));
                    if (!newName || newName == "") newName = colToDelete.name;
                    if (!newDataType || newDataType == "") newDataType = colToDelete.dataType;
                    if (!newIsNullable || newIsNullable == "") {
                        newIsNullable = colToDelete.isNullable;
                    } else {
                        newIsNullable = newIsNullable * 1 == 1;
                    }
                    colsToRename.push({
                        ...colToDelete,
                        newName, newDataType, newIsNullable
                    });
                    colsNotToDelete.push(colToDelete);

                    newCols = newCols.filter(x => !(x.name == newName && x.tableName == colToDelete.tableName));

                }
                else {
                    colsNotToDelete.push(colToDelete);
                    newCols = newCols.filter(x => !(x.name == colToDelete.name && x.tableName == colToDelete.tableName));

                }

            }

            for (let colToKeep of colsNotToDelete) {
                colsToDelete = colsToDelete.filter(x => !(x.tableName == colToKeep.tableName && x.name == colToKeep.name));
            }

            let uniqueTablesForColRenaming = Array.from(new Set(colsToRename.map(x => x.tableName)));

            for (let tableForRenaming of uniqueTablesForColRenaming) {
                let newTable = new Table(tableForRenaming);
                for (let colForRenaming of colsToRename.filter(x => x.tableName == tableForRenaming)) {

                    newTable.updateExistingColumn(colForRenaming.name)
                        .setNewName(colForRenaming.newName)
                        .setNullable(colForRenaming.newIsNullable)
                        .setDataType(colForRenaming.newDataType);
                }
                await newTable.update();
            }

            //#endregion

            //#region finding  tables for renaming
            let tablesToKeep = [];
            let tablesToRename = [];

            for (let tableToDelete of tablesToDelete) {
                let question = (`The Table ${tableToDelete.name} is not found on the source database!\n1=>Drop it\n2=>Modify It\nDefault: Keep it`);
                let task = await takeInput(question);
                if (task == 1) continue;
                if (task == 2) {
                    tablesToRename.push(tableToDelete);
                    while (1) {
                        let newName = await takeInput("Please provide new table name!");
                        if (newName == "") {
                            console.log("New Table name can not be blank!");
                            continue;
                        }
                        tableToDelete.newName = newName;
                    }
                }
                else {
                    tablesToKeep.push(tableToDelete);
                }
                addedTables = addedTables.filter(x => x.name != tableToDelete.name);
            }

            for (let tableToKeep of tablesToKeep) {
                fkeysToDelete = fkeysToDelete.filter(x => !(x.source_table == tableToKeep.name || x.target_table == tableToKeep.name));
            }

            for (let tableToKeep of tablesToRename) {
                fkeysToDelete = fkeysToDelete.filter(x => !(x.source_table == tableToKeep.name || x.target_table == tableToKeep.name));
            }

            tablesToDelete = tablesToDelete.filter(x => !tablesToKeep.some(y => y.name == x.name));
            tablesToDelete = tablesToDelete.filter(x => !tablesToRename.some(y => y.name == x.name));



            //#endregion


            //#region drop fkeys

            let distinctTables = Array.from(new Set(fkeysToDelete.map(x => x.tableName)));

            let promises = distinctTables.map(tableName => {
                let table = new Table(tableName);
                let fkeysOfThisTable = fkeysToDelete.filter(x => x.tableName == tableName);
                fkeysOfThisTable.forEach(fkey => {
                    table.dropForeignKey(fkey.columnName);
                });
                return table.update();

            });
            await Promise.all(promises);



            //#endregion

            //#region drop cols
            let distinctTablesForColDelete = Array.from(new Set(colsToDelete.map(x => x.tableName)));

            promises = distinctTablesForColDelete.map((tableName) => {
                let newTable = new Table(tableName);
                let colsToDeleteForThisTable = colsToDelete.filter(x => x.tableName == tableName);
                colsToDeleteForThisTable.forEach(async colToDelete => {
                    newTable.dropColumn(colToDelete.name);

                    let newFKeysToDelete = [];
                    this.Tables.forEach((thisTable) => {
                        newFKeysToDelete = [...newFKeysToDelete, ...thisTable.foreignKeyObjs.filter(x => x.source_column == colToDelete.name)];
                    });

                    let distinctTablesToDropFKeys = Array.from(new Set(newFKeysToDelete.map(x => x.tableName)));

                    let promises2 = distinctTablesToDropFKeys.map(tableName => {
                        let table = new Table(tableName);
                        let fkeysOfThisTable = newFKeysToDelete.filter(x => x.tableName == tableName);
                        fkeysOfThisTable.forEach(fkey => {
                            table.dropForeignKey(fkey.columnName);
                        });
                        return table.update();

                    });
                    await Promise.all(promises2);


                });
                return newTable.update();
            });
            await Promise.all(promises);

            //#endregion


            //#region drop tables



            promises = tablesToDelete.map(async tableToDrop => {
                let table = new Table(tableToDrop.name);

                for (let fkeysOfThisTable of tableToDrop.foreignKeyObjs) {

                    if (fkeysToDelete.filter(x => x.source_table == table.name || x.target_table == table.name)) continue;

                    table.dropForeignKey(fkeysOfThisTable.cname)
                }
                await table.update();
                return table.drop();
            });
            await Promise.all(promises);

            //#endregion

            //#region create tables
            promises = addedTables.map(table => {
                let newTable = new Table(table.name);
                newTable.columns = table.columns;




                return newTable.create();

            });
            await Promise.all(promises);

            //#endregion

            //#region create columns
            let distinctTablesForNewCols = Array.from(new Set(newCols.map(x => x.tableName)));
            promises = distinctTablesForNewCols.map(tableName => {
                let newTable = new Table(tableName);
                newTable.columns = newCols.filter(x => x.tableName == tableName)
                    .map(x => {
                        let newCol = new Column(x.name);
                        newCol.dataType = x.dataType;
                        newCol.defaultValue = x.defaultValue;
                        newCol.isNullable = x.isNullable;
                        newCol.isPrimaryKey = x.isPrimaryKey;
                        newCol.isAutoIncrement = x.isAutoIncrement;
                        newCol.isUnique = x.isUnique;
                        return newCol;
                    });
                return newTable.update();
            });
            await Promise.all(promises);
            //#endregion

            //#region create fkeys
            let distinctTablesForNewFkeys = Array.from(new Set(newForeignKeys.map(x => x.tableName)));
            promises = distinctTablesForNewFkeys.map(tableName => {
                let newTable = new Table(tableName);
                newForeignKeys.filter(x => x.tableName == tableName)
                    .forEach(x => {
                        let { columnName, refTable, refColumn } = x;
                        newTable.addForeignKey(columnName, refTable, refColumn);
                    });
                return newTable.update();
            });
            await Promise.all(promises);

            //#endregion

            //#region renaming tables
            promises = tablesToRename.map(async tableToRename => {
                let table = new Table(tableToRename.name);

                table.rename(tableToRename.newName);
                await table.update();

            });
            await Promise.all(promises);

            for (let tableToStay of [...tablesToKeep, ...tablesToRename]) {
                fkeysToDelete = fkeysToDelete.filter(x => !(x.source_table == tableToStay.name || x.target_table == tableToStay.name));
            }
            //#endregion
            await DBConnection.commit();

            console.log(`Database ${this.Name} Is Updated Successfully!`);
            console.log(`=======================================================================`)

        } catch (error) {
            console.log(error);
            await DBConnection.rollback();
        }
        finally {
            Table.isDisperseMode = false;

            DBConnection.credential = null;
            DBConnection.ShouldCloseConnectionNow = true;
            await DBConnection.endTransaction();
            if (Database.isDisposeReadline)
                rl.close();
        }

    }

}

module.exports = { Database };