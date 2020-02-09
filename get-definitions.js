"use strict";

const sqlite3 = require("sqlite3").verbose();
const request = require("request-promise");
const { promisify } = require("util");

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
  ).map(({ lemme }) => lemme.trim());

  const definitions = await Promise.all(
    verbs.map(async (verb, i) => {
      let cards = [];
      await promisify(setTimeout)(50 * i);
      console.error(i);
      return await request(
        `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${
          process.env.API_KEY
        }&lang=fr-ru&text=${encodeURI(verb)}`,
        { json: true }
      );
    })
  );
  console.log(JSON.stringify(definitions));
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

async function dictionaryDefinition(word) {
  let result = "";
}
