var sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const { Readable } = require("stream");
const childProcess = require("child_process");

const conjugationMapping = {
  default: ["je", "tu", "il, elle, on", "nous", "vous", "ils, elles"],
  "imperative present": ["tu", "nous", "vous"]
};

const regular = {
  er: "parler",
  ir: "choisir",
  re: "vendre"
};
const models = {};
const irregular = {};

const childrenToModels = {};
JSON.parse(fs.readFileSync("./irregular/irregular.json")).forEach(obj => {
  obj.children.forEach(child => {
    irregular[child] = obj.model;
  });
  models[obj.model] = false;
  for (let i = 0; i < obj.children.length; i++) {
    const verb = obj.children[i];
    childrenToModels[verb] = obj.model;
  }
});

(async function() {
  const verbs = (
    await select(
      "./test.db",
      `
        SELECT
          lemme,
          AVG((freqlemfilms2 + freqlemlivres) / 2) AS avg,
          cgram
        FROM
          lexique
        GROUP BY
          lemme,
          cgram
        HAVING
          cgram = 'VER'
        ORDER BY
          avg DESC
        LIMIT
          1000;
        `
    )
  ).map(({ lemme }) => lemme);

  for (let i = 0; i < verbs.length; i++) {
    const verb = verbs[i];
    if (models.hasOwnProperty(verb)) {
      console.log(conjugate(verb));
    }
  }
})();

function select(database, sql) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(database);
    const queries = [];
    db.each(
      sql,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          queries.push(row);
        }
      },
      (err, n) => {
        if (err) {
          reject(err);
        } else {
          resolve(queries);
        }
      }
    );
  });
}

function conjugate(verb) {
  if (verb !== "pleuvoir") {
    return;
  }
  const lines = childProcess
    .execSync("french-conjugator " + verb)
    .toString()
    .split("\n");

  if (lines[0] === "-") {
    throw new Error("Cannot conjugate " + verb);
  }

  const result = {};
  let tense;
  let counter = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "-") {
      continue;
    }

    if (line.indexOf("- ") !== -1) {
      tense = line.substring(0, line.length - 1).split("- ")[1];
      counter = 0;
      continue;
    }

    if (["infinitive present", "participle present"].includes(tense)) {
      result[tense] = line;
      continue;
    }
    if (tense === "participle past" && !result[tense]) {
      result[tense] = line;
      continue;
    } else if (tense === "participle past") {
      continue;
    }

    if (!result[tense]) {
      result[tense] = {};
    }
    if (tense === "imperative present") {
      result[tense][conjugationMapping["imperative present"][counter]] = line;
    } else {
      result[tense][conjugationMapping["default"][counter]] = line;
    }
    counter++;
  }
  return result;
}
