const postgres = require('postgres');
require("dotenv").config();

const sql = postgres({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  }); // will use psql environment variables

module.exports = {
  sql
}