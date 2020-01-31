const cheerio = require('cheerio');
const request = require('request-promise');
const util = require('util');

const irregularModels = [
    'lever',
    'céder',
    'commencer',
    'manger',
    'appeler',
    'acheter',
    'protéger',
    'payer',
    'employer',
    'envoyer',
    'aller',

    'tenir',
    'partir',
    'ouvrir',
    'acquérir',
    'assaillir',

    'bouillir',
    'dormir',
    'courir',
    'cueillir',
    'fuir',
    'servir',
    'vêtir',
    'faillir',
    'gésir',
    'mourir',
    'haïr',

    'recevoir',
    'voir',
    'pourvoir',
    'devoir',
    'mouvoir',
    'pleuvoir',
    'valoir',
    'asseoir',
    'choir',
    'échoir',
    'déchoir',
    'falloir',
    'pouvoir',
    'savoir',
    'seoir',
    'messeoir',
    'surseoir',
    'vouloir',

    'traduire',
    'connaître',
    'accroître',
    'atteindre',
    'joindre',
    'craindre',
    'conclure',
    'absoudre',
    'distraire',
    'plaire',

    'mettre',
    'prendre',
    'battre',
    'vaincre',
    'faire',
    'naître',
    'croire',
    'boire',
    'clore',
    'coudre',
    'moudre',
    'suivre',
    'vivre',
    'lire',
    'dire',
    'rire',
    'écrire',
    'frire',
    'paître',
    'repaître',
    'maudire',
    'foutre',
    'contrefoutre',
    'être',
    'avoir'
];

(async function() {
    const models = irregularModels;
    const promises = models.map(async verb => {});

    const withChildren = [];
    for (let i = 0; i < models.length; i++) {
        const verb = models[i];
        const response = await request(
            `https://www.wordreference.com/conj/FrVerbs.aspx?v=${verb}`,
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (X11; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0',
                    Accept:
                        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ru,en-US;q=0.7,en;q=0.3',
                    'Upgrade-Insecure-Requests': '1',
                    Pragma: 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            }
        );
        const $ = cheerio.load(response);
        withChildren.push({
            model: verb,
            children: $('td.left ol li a')
                .toArray()
                .map(function(link) {
                    return $(link).text();
                })
        });
        console.error(i);
        await util.promisify(setTimeout)(Math.random() * 1000 + 500);
    }

    console.log(JSON.stringify(withChildren));
})();
