const { MongoClient } = require("mongodb");

let _db;

const initDb = (callback) => {
  if (_db) {
    console.log("Database is already initialized!");
    return callback(null, _db);
  }
  MongoClient.connect(
    `mongodb+srv://Tommi:${process.env.DB_PASSWORD}@database.7tqi7.mongodb.net/Blog?retryWrites=true&w=majority`,
    { useUnifiedTopology: true }
  )
    .then((client) => {
      _db = client;
      callback(null, _db);
    })
    .catch((err) => {
      callback(err);
    });
};

const getDb = () => {
  if (!_db) {
    throw Error("Database not initialzed");
  }
  return _db;
};

module.exports = {
  initDb,
  getDb,
};
