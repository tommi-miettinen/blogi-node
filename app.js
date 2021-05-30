require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("./db");
const cors = require("cors");
const path = require("path");
const { ObjectId } = require("bson");
const moment = require("moment");
const authenticateJWT = require("./auth").authenticateJWT;
const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname, "build")));
app.use(cors());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.get("/api/posts", async (req, res) => {
  try {
    const data = await db.getDb().db().collection("Posts").find({}).toArray();
    res.send(data);
  } catch (err) {
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const data = await db
      .getDb()
      .db()
      .collection("Posts")
      .findOne({ _id: ObjectId(req.params.id) });
    if (data) return res.send(data);
    res.status(404).send({ error: "eipä löytyny" });
  } catch (err) {
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.delete("/api/posts/:id", authenticateJWT, async (req, res) => {
  try {
    const result = await db
      .getDb()
      .db()
      .collection("Posts")
      .deleteOne({ _id: ObjectId(req.params.id) });
    if (result.deletedCount === 1) return res.send(200);
    res.status(500).send({ error: "kävi kehnosti" });
  } catch (err) {
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.patch("/api/posts/:id", authenticateJWT, async (req, res) => {
  try {
    const result = await db
      .getDb()
      .db()
      .collection("Posts")
      .updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $set: {
            title: req.body.title,
            content: req.body.content,
            imageUrl: req.body.imageUrl,
            editedAt: moment().locale("fi").format("LL"),
          },
        },
        { upsert: false }
      );
    if (result.modifiedCount === 1) return res.send(200);
    res.status(500).send({ error: "kävi kehnosti" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.post("/api/posts", authenticateJWT, async (req, res) => {
  try {
    const post = {
      title: req.body.title,
      content: req.body.content,
      imageUrl: req.body.imageUrl,
      createdAt: moment().locale("fi").format("LL"),
    };
    const result = await db.getDb().db().collection("Posts").insertOne(post);
    if (result.insertedCount === 1) return res.send(200);
    res.status(500).send({ error: "kävi kehnosti" });
  } catch (err) {
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.post("/api/users", async (req, res) => {
  const { password, email } = req.body;
  console.log(password, email);
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await db
      .getDb()
      .db()
      .collection("Users")
      .updateOne(
        {},
        { $setOnInsert: { password: hashedPassword, email } },
        { upsert: true }
      );
    let token;
    if (result.upsertedCount === 1) {
      token = jwt.sign({ email: result.email }, process.env.JWT_SECRET);
      return res.status(201).send(token);
    }
    res.status(500).send({ error: "kävi kehnosti" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await db.getDb().db().collection("Users").findOne({});
    if (result) return res.status(200).send(result);
    res.status(404);
  } catch (err) {
    return res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.post("/api/login", async (req, res) => {
  const { password, email } = req.body;
  try {
    const result = await db.getDb().db().collection("Users").findOne({});
    const passwordMatch = await bcrypt.compare(password, result.password);
    if (passwordMatch && result.email === email) {
      let token = jwt.sign({ email: result.email }, process.env.JWT_SECRET);
      return res.status(200).send(token);
    }
    res.send(401);
  } catch (err) {
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.get("/api/authenticate", authenticateJWT, async (req, res) => {
  try {
    const result = await db.getDb().db().collection("Users").findOne({});
    if (req.user.email === result.email) return res.send(200);
    res.send(403);
  } catch (err) {
    res.status(500).send({ error: "kävi kehnosti" });
  }
});

app.use("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

db.initDb((err, db) => {
  if (err) {
    console.log(err);
  } else {
    app.listen(port, () => console.log(`Server started on port ${port}`));
  }
});
