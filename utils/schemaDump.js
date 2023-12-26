const { exec } = require("child_process");
const fs = require('fs')
const readline = require('readline');
async function dumpSchema() {
    const env = require(process.cwd() + '/migrations/config.json')
    const command = `mysqldump -u ${env.dbUser} -p${env.dbPassword} --no-data ${env.dbName} > ${process.cwd() + '/migrations/' + env.dbName}.sql`;
    return new Promise((resolve, reject) => {
        exec(command, (err) => {
            const fileStream = fs.createReadStream(`${process.cwd() + '/migrations/' + env.dbName}.sql`);

            let lines = []
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity // To handle both \r\n and \n line endings
            });
            // Event listener for each line
            rl.on('line', (line) => {
                if (line.startsWith('DROP TABLE')) { return }
                if (line.startsWith('CREATE TABLE')) {
                    let words = line.split(" ")
                    words = [words[0], words[1], "IF NOT EXISTS", words[2], words[3]]
                    lines.push(words.join(' ') + '\n')

                }
                else
                    lines.push(line + '\n')
            });

            // Event listener for the end of the file
            rl.on('close', (e) => {
                const outputStream = fs.createWriteStream(`${process.cwd() + '/migrations/' + env.dbName}.sql`);
                lines.forEach(line => {
                    outputStream.write(line)
                })
                outputStream.close()
            })
        })
    })
}

async function dumpData() {
    const env = require(process.cwd() + '/migrations/config.json')
    const command = `mysqldump -u ${env.dbUser} -p${env.dbPassword}   ${env.dbName} > ${process.cwd() + '/migrations/' + env.dbName}.sql`;
    return new Promise((resolve, reject) => {
        exec(command, (err) => {
            const fileStream = fs.createReadStream(`${process.cwd() + '/migrations/' + env.dbName}.sql`);

            let lines = []
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity // To handle both \r\n and \n line endings
            });
            // Event listener for each line
            rl.on('line', (line) => {
                if (line.startsWith('DROP TABLE')) { return }
                if (line.startsWith('CREATE TABLE')) {
                    let words = line.split(" ")
                    words = [words[0], words[1], "IF NOT EXISTS", words[2], words[3]]
                    lines.push(words.join(' ') + '\n')

                }
                else
                    lines.push(line + '\n')
            });

            // Event listener for the end of the file
            rl.on('close', (e) => {
                const outputStream = fs.createWriteStream(`${process.cwd() + '/migrations/' + env.dbName}.sql`);
                lines.forEach(line => {
                    outputStream.write(line)
                })
                outputStream.close()
            })
        })
    })
}
module.exports = { dumpSchema, dumpData }