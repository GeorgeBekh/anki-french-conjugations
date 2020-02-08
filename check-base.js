"use strict";

const conjugate = require("./conjugate");
const fs = require("fs");

const models = [];

(async function() {
  JSON.parse(fs.readFileSync("./models/models.json")).forEach(obj => {
    models.push(obj.model);
  });

  const result = await Promise.all(
    models.map(async model => {
      const conjugations = await conjugate(model);
      const future = Object.values(conjugations["indicative future"]);
      const conditional = Object.values(conjugations["conditional present"]);
      const futureThird = future[2].split(", ")[0];
      const condThird = conditional[2].split(", ")[0];
      const base = futureThird.substring(0, futureThird.length - 1);
      const condBase = condThird.substring(0, condThird.length - 3);
      return condBase + " - " + base + " - " + model;
    })
  );

  console.log("models: ", result);
})();
