"use strict";

var sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const { Readable } = require("stream");
const childProcess = require("child_process");
const stringify = require("csv-stringify/lib/sync");
const conjugate = require("./conjugate");
const { promisify } = require("util");

const tenses = [
  "indicative present",
  "participle present",
  "participle past",
  "indicative imperfect",

  "indicative future",
  "subjunctive present",
  "imperative present"
];

const coloring = {
  "indicative imperfect": "#0000ca",
  "imperative present": "#db0000"
};

const namingMap = {
  "indicative present": "présent",
  "participle past": "participe passé",
  "indicative imperfect": "imparfait",
  "participle present": "participe présent",

  "subjunctive present": "subjonctif",
  "imperative present": "impératif"
};

const regular = {
  parler: "re",
  choisir: "ir",
  vendre: "re"
};
const models = {};
const irregular = {};

const childrenToModels = {};

const definitions = {};
JSON.parse(fs.readFileSync("./models/models.json")).forEach(obj => {
  obj.children.forEach(child => {
    childrenToModels[child] = obj.model;
  });
  models[obj.model] = false;
});

prepareDefinitions();

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
          1000
        `
    )
  ).map(({ lemme }) => lemme);

  const promises = verbs.map(async (verb, i) => {
    let cards = [];
    const definition = dictionaryDefinition(verb);
    if (definition) {
      cards.push({ verb, definition });
    }
    if (!models.hasOwnProperty(verb)) {
      const model = childrenToModels[verb];
      if (!model) {
        //regular verb
        return [];
      }
      cards.push({
        verb,
        model
      });
      return cards;
    }

    const conjugations = await conjugate(verb);
    tenses.forEach(tense => {
      cards = cards.concat(conjugationsForTense(verb, conjugations, tense));
    });

    return cards;
  });

  const conjugatedVerbs = (await Promise.all(promises)).reduce(
    (result, elem) => result.concat(elem),
    []
  );
  const cards = await Promise.all(
    conjugatedVerbs.map(
      async (
        { conjugation, verb, definition, tense, pronoun, base, model },
        index
      ) => {
        const ipa = await getIPA(conjugation || base || model || verb);
        let question;
        if (model) {
          question = "conjugue comme...";
        } else if (base) {
          question = "futur, conditionnel (base)";
        } else if (conjugation) {
          if (coloring[tense]) {
            question = `<span style="color: ${coloring[tense] || black};">${
              namingMap[tense]
            }</span>`;
          } else {
            question = `${namingMap[tense]}`;
          }
          question += pronoun ? "<br/>" + pronoun : "";
        } else {
          question = "définition";
        }
        return {
          index: index,
          verb,
          question,

          conjugation,
          ipa: ipa.trim(),
          definition,
          isRegular: regular[verb] && 1,
          base,
          model
        };
      }
    )
  );

  const data = stringify(cards, {
    columns: [
      "index",
      "verb",
      "question",
      "conjugation",
      "ipa",
      "definition",
      "isRegular",
      "base",
      "model"
    ]
  });
  console.log(data);
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

async function getIPA(word) {
  return (
    //Prefix 'tu' fixes the error when 'as' is transcribed as 'as instead of 'a
    (
      await promisify(childProcess.exec)(
        'espeak -q -v fr --ipa "tu ' + word + '"'
      )
    ).stdout
      .slice(3)
      .split("\n")
      .join("")
  );
}

function dictionaryDefinition(word) {
  const defs = definitions[word];
  if (!defs) {
    return;
  }
  return (
    "<ol>" +
    defs.reduce((result, { tr }) => {
      return (
        result +
        tr.reduce((result, { text, ex }) => {
          return (
            result +
            "<li>" +
            text +
            "<ul>" +
            (ex || []).reduce(
              (r, ex) => r + "<li>" + ex.text + " - " + ex.tr[0].text + "</li>",
              ""
            ) +
            "</ul>" +
            "</li>"
          );
        }, "")
      );
    }, "") +
    "</ol>"
  );
}

function conjugationsForTense(verb, conjugations, tense) {
  const result = [];

  if (typeof conjugations[tense] === "string") {
    result.push({
      verb,
      tense,
      conjugation: conjugations[tense]
    });

    return result;
  } else if (tense === "indicative future") {
    result.push({
      verb,
      base: getBaseFuture(conjugations[tense])
    });
    return result;
  }

  for (let pronoun in conjugations[tense]) {
    const conjugation = conjugations[tense][pronoun];
    if (!conjugation) {
      continue;
    }
    result.push({
      verb,
      tense,
      conjugation,
      pronoun
    });
  }

  return result;
}

function getBaseFuture(futureConjs) {
  return futureConjs["il, elle, on"]
    .split(", ")
    .map(conj => conj.substring(0, conj.length - 1))
    .join(", ");
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function prepareDefinitions() {
  JSON.parse(fs.readFileSync("./definitions.json")).forEach(({ def }) => {
    if (def[0]) {
      definitions[def[0].text] = def;
    }
  });
}
