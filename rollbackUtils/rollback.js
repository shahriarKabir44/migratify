const fs = require('fs')
const { dropTable } = require('./dropTable')
const { revertUpdates } = require('./revertUpdate')
async function rollback() {
    let path = process.cwd() + '/migrations/'
    let migrationFileNames = fs.readFileSync(path + '/index.txt').toString().split('\n')
    const lastMigration = migrationFileNames[migrationFileNames.length - 1].replace('.js', '')
    const actions = require(path + '/metadata/' + lastMigration + '.json')
    if (actions['case'] == 'create') {
        await dropTable(actions['table'])
    }
    else {
        await revertUpdates(actions['changes'], actions['table'])
    }
    migrationFileNames.pop()
    migrationFileNames = migrationFileNames.join('\n')
    fs.writeFileSync(path + '/index.txt', migrationFileNames)
    fs.writeFileSync(path + '/logs.txt', migrationFileNames)
    fs.unlinkSync(path + '/metadata/' + lastMigration + '.json');
    fs.unlinkSync(path + '/' + lastMigration + '.js');

}

module.exports = { rollback }