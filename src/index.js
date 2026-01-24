const core = require('@actions/core');

const person = core.getInput('person');

console.log(`Hey, welcome ${person}! Here's a test part 7`);
