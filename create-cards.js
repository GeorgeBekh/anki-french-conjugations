var sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const regular = {
    er: 'parler',
    ir: 'choisir',
    re: 'vendre'
};
const models = {};
const irregular = {};
JSON.parse(fs.readFileSync('./irregular/irregular.json')).forEach(obj => {
    obj.children.forEach(child => {
        irregular[child] = obj.model;
    });
    models[obj.model] = false;
});
(async function() {
    const verbs = (
        await select(
            './test.db',
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
          10;
        `
        )
    ).map(({ lemme }) => lemme);

    for (let i = 0; i < verbs.length; i++) {
        const verb = verbs[i];
        if (models.hasOwnProperty(verb)) {
            console.log(
                verb + ' - model verb, generating and scheduling the cards..'
            );
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
