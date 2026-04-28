const Database = require('better-sqlite3')
const path = require('path')

// Crée (ou ouvre) le fichier .db dans ton projet
const db = new Database(path.join(__dirname, 'labyrinthe.db'))

// Crée la table utilisateurs si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`)

module.exports = db