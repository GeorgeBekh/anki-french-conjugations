var sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const { Readable } = require("stream");
const childProcess = require("child_process");
const stringify = require("csv-stringify/lib/sync");

const conjugationMapping = {
  default: ["je", "tu", "il, elle, on", "nous", "vous", "ils, elles"],
  "imperative present": ["tu", "nous", "vous"]
};

const actualTenses = [
  "indicative present",
  "participle past",
  "indicative imperfect",
  "participle present",

  "indicative future",
  "conditional present",
  "subjunctive present",
  "imperative present"
];

const namingMap = {
  "indicative present": "présent",
  "participle past": "participe passé",
  "indicative imperfect": "imparfait",
  "participle present": "participe passé",

  "indicative future": "futur simple",
  "conditional present": "conditionnel",
  "subjunctive present": "subjonctif",
  "imperative present": "impératif"
};

const regular = {
  er: "parler",
  ir: "choisir",
  re: "vendre"
};
const models = {};
const irregular = {};

const childrenToModels = {};
let cards = [];
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
          20;
        `
    )
  ).map(({ lemme }) => lemme);

  for (let i = 0; i < verbs.length; i++) {
    const verb = verbs[i];
    if (models.hasOwnProperty(verb)) {
      const conjugations = conjugate(verb);
      cards.push({
        verb,
        tense: "infinitive present",
        definition: dictionaryDefinition(verb)
      });
      for (let j = 0; j < actualTenses.length; j++) {
        const tense = actualTenses[j];
        if (typeof conjugations[tense] === "string") {
          const ipa = getIPA(conjugations[tense]);
          cards.push({
            verb,
            tense,
            conjugation: conjugations[tense]
          });
        } else {
          for (var pronoun in conjugations[tense]) {
            const conjugation = conjugations[tense][pronoun];
            cards.push({
              verb,
              tense,
              conjugation,
              pronoun
            });
          }
        }
      }
    }
  }

  cards.map((card, index) => {
    const ipa = getIPA(card.conjugation || card.verb);
    card.ipa = ipa;
    card.index = index;
    card.tense = namingMap[card.tense];
  });
  const data = stringify(cards, {
    columns: [
      "index",
      "verb",
      "tense",
      "pronoun",
      "conjugation",
      "ipa",
      "definition"
    ]
  });
  console.log("data: ", data);
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

function getIPA(word) {
  return childProcess
    .execSync("espeak -q -v fr --ipa " + word)
    .toString()
    .split("\n")[0]
    .split(" ")[1];
}

function dictionaryDefinition(word) {
  let result = "";
  try {
    result = childProcess.execSync("dict -d fd-fra-rus -f " + word);
  } catch (err) {
    result = childProcess.execSync("dict -d fd-fra-eng -f " + word);
  }
  return result
    .toString()
    .split("\n")
    .slice(3)
    .join("\n");
}
