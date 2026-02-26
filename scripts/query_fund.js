
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const query = "SELECT * FROM funds WHERE nombre LIKE '%Allaria Agro%Clase A%' LIMIT 1";

db.get(query, [], (err, row) => {
    if (err) {
        console.error(err.message);
        process.exit(1);
    }
    if (row) {
        console.log(JSON.stringify(row, null, 2));
    } else {
        console.log("Fund not found");
    }
    db.close();
});
