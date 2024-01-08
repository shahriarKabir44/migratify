const fs = require('fs')
const { dropTable } = require('./dropTable')
const { revertUpdates } = require('./revertUpdate')
const { createTable } = require('./createTable')
async function rollback() {
    let path = process.cwd() + '/migrations/'
    let migrationFileNames = fs.readFileSync(path + '/index.txt').toString().split('\n')
    const lastMigration = migrationFileNames[migrationFileNames.length - 1].replace('.js', '')
    const actions = require(path + '/metadata/' + lastMigration + '.json')
    try {
        if (actions['case'] == 'create') {
            await dropTable(actions['table'])
        }
        else if (actions['case'] == 'drop') {
            await createTable(actions['table'], actions['structure'])
        }
        else {
            await revertUpdates(actions['changes'], actions['table'])
        }
    } catch (error) {
        return
    }

    migrationFileNames.pop()
    migrationFileNames = migrationFileNames.join('\n')
    fs.writeFileSync(path + '/index.txt', migrationFileNames)
    fs.writeFileSync(path + '/logs.txt', migrationFileNames)
    fs.unlinkSync(path + '/metadata/' + lastMigration + '.json');
    fs.unlinkSync(path + '/' + lastMigration + '.js');

}

module.exports = { rollback }