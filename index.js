const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Model
const userSchema = new mongoose.Schema({
  username: String,
});
userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.__v;
  },
});
const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: { type: String, require: true },
  duration: { type: Number, require: true },
  date: Date,
  userId: String,
});
exerciseSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.__v;
  },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// App
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });

app.get("/api/delete", async (req, res) => {
  await User.deleteMany()
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      res.end(error);
    });
  await Exercise.deleteMany()
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      res.end(error);
    });
  res.end("Delete successfully!");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  new User({ username: req.body.username }).save().then((user) => {
    res.json(user);
  });
});

app.get("/api/users", (req, res) => {
  User.find({}).then((users) => {
    res.json(users);
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  let { description, duration, date } = req.body;
  User.findById(userId)
    .then((user) => {
      if (!date) {
        date = new Date().toDateString();
      } else {
        date = new Date(date).toDateString();
      }
      const newExercise = {
        username: user.username,
        description,
        duration,
        date,
        userId,
      };
      new Exercise(newExercise).save().then((exercise) => {
        const { username, description, duration, date } = exercise;
        res.json({
          username,
          description,
          duration,
          date: exercise.date.toDateString(),
          _id: exercise.userId,
        });
      });
    })
    .catch((error) => {
      res.json({ error: "Invalid user id" });
    });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const from = req.query.from || new Date(0).toISOString().substring(0, 10);
  const to =
    req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
  const limit = Number(req.query.limit) || 0;

  const exercises = await Exercise.find({
    userId,
    date: { $gte: from, $lte: to },
  })
    .select("description duration date")
    .limit(limit)
    .exec();

  if (!exercises) {
    res.json("Empty log");
  }
  const count = exercises.length;
  const _id = exercises[0].userId;
  const username = exercises[0].username;
  const log = [];
  exercises.forEach((exercise) => {
    const { description, duration, date } = exercise;
    log.push({ description, duration, date: date.toDateString() });
  });
  res.json({ _id, username, count, log });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
