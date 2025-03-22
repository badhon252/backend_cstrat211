const express = require("express");
const dbConnection = require("./dbConfig/dbConnection");
const dotenv = require("dotenv").config();
const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
    return res.status(201).send("Welcome to the server");
  });
  
  app.listen(PORT, async () => {
    await dbConnection();
    console.log(`server is running at http://localhost:${PORT}`);
  });
  