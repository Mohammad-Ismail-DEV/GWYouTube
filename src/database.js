var mysql = require("mysql")
var connection = mysql.createConnection({
    multipleStatements: true,
    host: "localhost",
    user: "root",
    password: "",
    database: "GWYouTube",
    port: 3306
})
connection.connect((err) => {
    if (err) {
        console.log(err)
        return
    }
    console.log("Database connected")
})
module.exports = connection
