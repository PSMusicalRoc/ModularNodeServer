import express from "express";

const app = express.Router();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const serverModule = {
  router: app
};

export default serverModule;
