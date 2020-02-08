const childProcess = require("child_process");
const conjugationMapping = {
  default: ["je", "tu", "il, elle, on", "nous", "vous", "ils, elles"],
  "imperative present": ["tu", "nous", "vous"]
};
const { promisify } = require("util");

module.exports = async function conjugate(verb) {
  const lines = (
    await promisify(childProcess.exec)("french-conjugator " + verb)
  ).stdout.split("\n");

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
};
