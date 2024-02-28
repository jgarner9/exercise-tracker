//module imports
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Model = mongoose.model;
require("dotenv").config();

//functions for program logic

//middleware
app.use(cors());
app.use(express.static("public"));
//POST body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//mongoose connection
mongoose.connect(process.env.MONGO_URI);

//mongoose schemas
const UserSchema = new Schema({
  username: String,
});

const LogSchema = new Schema({
  username: String,
  count: Number,
  _id: String,
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

//mongoose models
const UserModel = new Model("User", UserSchema);
const LogModel = new Model("Log", LogSchema);

//routes
//root route for page serve
app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//create user route
app.post("/api/users", async (req, res) => {
  //check to find user doc
  const findUserDocument = await UserModel.findOne(
    {
      username: req.body.username,
    },
    "username"
  );
  //if exists, return doc, else generate new doc
  if (findUserDocument) {
    res.json(findUserDocument);
  } else {
    const newUser = new UserModel();
    newUser.username = req.body.username;
    const newUserLog = new LogModel({
      _id: newUser._id,
      username: req.body.username,
      count: 0,
    });
    await newUser.save();
    await newUserLog.save();
    res.json({ username: newUser.username, _id: newUser._id });
  }
});

app.get("/api/users", async (req, res) => {
  //empty filter to get all documents in an array
  const userArray = await UserModel.find({}, "username _id");
  res.json(userArray);
});

//add exercise route
app.post("/api/users/:_id/exercises", async (req, res) => {
  //create var for user document, response, and user log document
  const userDocument = await UserModel.findOne(
    { _id: req.params._id },
    "username _id"
  );
  const date = req.body.date
    ? new Date(req.body.date.split("-")).toDateString()
    : new Date().toDateString();
  const response = {
    username: userDocument.username,
    description: req.body.description,
    duration: Number(req.body.duration),
    _id: req.params._id,
    date: date,
  };
  const userLog = await LogModel.findOneAndUpdate(
    { _id: req.params._id },
    "_id username count log"
  );
  userLog.log.push({
    description: req.body.description,
    duration: req.body.duration,
    date: date,
  });
  userLog.count += 1;
  await userLog.save();
  res.json(response);
});

//retrieve exercise log route
app.get("/api/users/:_id/logs", async (req, res) => {
  //return log based on _id in request
  const logDocument = await LogModel.findOne(
    { _id: req.params._id },
    "_id username count log"
  );
  console.log(req.query)
  if (req.query.from && req.query.to) {
    const filteredLog = logDocument.log.filter(log => {
      const date = new Date(log.date)
      const dateTo = new Date(req.query.to)
      const dateFrom = new Date(req.query.from)
      return date > dateFrom && date < dateTo
    })
    logDocument.log = filteredLog
  }
  
  if (req.query.limit) {
    const copy = logDocument.log
    logDocument.log = copy.splice(0, req.query.limit)
  }

  console.log(logDocument)
  res.json(logDocument);
});

//port listener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
