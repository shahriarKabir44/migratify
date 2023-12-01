<h1>Node.Js Mysql Migration tool</h1>

<h4>A simple Mysql migration tool than you can integrate in your project to perform database migration.</h4>

<h2>How to use:</h2>
<ol>
    <li>type <code>npm i -g migratify</code> (for CLI)
    </li>
    <li>type <code>npm i migratify</code> (inside your project directory for utility classes)</li>
    <li>That's it</li>
</ol>
<h2>Features</h2>
<h3><u>Create database:</u></h3>
Go to your project directory and type <br> <code> migratify create-db</code> </br>
This will ask you for your database name, password, user, host etc. Type the answers accordingly. And it will create a
database for you. And inside your project directory, it will create a folder called "migrations". This is where your
migration files will be stored.

<h3><u>Create table:</u></h3>
Go to your project directory and type <code> migratify create-table tablename </code>. </br>
This will create a migration file in the <code>migrations</code></br> directory. Replace the <code>tablename</code>
argument with the name of the table you want to create. Open the newly created file in your code editor. It will look
something like this: <br>
<code>
const { Table } = require('../templates/Migration.class')
let newTable =new Table("tablename")
module.exports = async () => {
    newTable.create()
}
</code>

Here is a list of methods that you can use to add properties in your table:
<table border="1">
    <thead>
        <tr>
            <th>Method</th>
            <th>Description</th>
        </tr>
        <tr>
            <td> <code>newTable.setId(idName)</code> </td>
            <td>Adds an ID property of that table. The parameter is a string. The name of the ID column</td>
        </tr>
        <tr>
            <td> <code>newTable.addColumn(columnName,dataType)</code> </td>
            <td>Adds a column named "columnName" with type "dataType". The data types are MySQL data type.</td>
        </tr>
        <tr>
            <td> <code>newTable.addColumn(columnName,dataType).setNullable(true)</code> </td>
            <td>Makes the column NOT NULL</td>
        </tr>
        <tr>
            <td> <code>newTable.addColumn(columnName,dataType).setDefaultValue(defaultValue)</code> </td>
            <td>Sets the default value to a certain value.</td>
        </tr>
        <tr>
            <td> <code>newTable.addColumn(columnName,dataType).setUnique(true)</code> </td>
            <td>Sets the default value to a certain value.</td>
        </tr>
        <tr>
            <td>
                <code>newTable.addForeignKey(columnName, refTable, refColumn)</code>
            </td>
            <td>
                Sets a foreign key to column name that refers to <code>refColumn</code> column from the
                <code>refTable</code> table
            </td>
        </tr>
    </thead>
</table>



<h3><u>Update table:</u></h3>
Go to your project directory and type <code> migratify update-table tablename </code>. </br>
This will create a migration file in the <code>migrations</code></br> directory. Replace the <code>tablename</code>
argument with the name of the table you want to create. Open the newly created file in your code editor. It will look
something like this: <br>
<code>
const { Table } = require('../templates/Migration.class')
let newTable = new Table("tablename")
module.exports = async () => {
    newTable.update()
}
</code>

Here is a list of methods that you can use to update your table:
<table border="1">
    <thead>
        <tr>
            <th>Method</th>
            <th>Description</th>
        </tr>
        <tr>
            <td> <code>newTable.renameColumn(oldName, newName)</code> </td>
            <td>Renames the column from oldName to newName</td>
        </tr>
        <tr>
            <td> <code>newTable.removeProperty(columnName)</code> </td>
            <td>Removes a column named columnName</td>
        </tr>
        <tr>
            <td> <code>newTable.addColumn(columnName,dataType)</code> </td>
            <td>Described earlier</td>
        </tr>
        <tr>
            <td>
                <code>newTable.addForeignKey(columnName, refTable, refColumn)</code>
            </td>
            <td>
                Sets a foreign key to column name that refers to <code>refColumn</code> column from the
                <code>refTable</code> table
            </td>
        </tr>
        <tr>
            <td> <code> renameColumn(oldName, newName)</code> </td>
            <td>
                Renames a column to a new name
            </td>
        </tr>
    </thead>
</table>


<h3><u>Migrate:</u></h3>
To commit the changes to the database, run the following command:
Type <code>migratify migrate</code>

This will run all the migration files and update the database schema.

<h3> <u>Load from existing database:</u></h3>
To create migration files from an existing database, type the command on the terminal <code>migratify load-db</code>.
This will ask the user for database name, password etc.


<h3> <u>Rollback:</u></h3>
To undo the effect of the latest commit file, type the command on the terminal <code>migratify rollback</code>.
Not only that it will roll back, it will also delete the migration file.

<h3><u>Help:</u></h3>
To see the list of commands,
Type <code>migratify help</code>

<h3>Note:</h3>
Please add the <code>logs.txt</code> and <code>config.txt</code> to your project's <code>.gitignore</code> file.

<code>  <a href="https://github.com/shahriarKabir44/migratify"><h3><i>Github Repo</i></h3></a></code>