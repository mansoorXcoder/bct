const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(
    __dirname,
    "land_records.db"
);

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

console.log(
    `SQLite database connected: ${databasePath}`
);

module.exports = db;