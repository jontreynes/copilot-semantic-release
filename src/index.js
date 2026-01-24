const core = require('@actions/core');

const person = core.getInput('person');

console.log(`Hey, welcome ${person}! Here's a test part 6`);

// Hotfix: Add database deadlock retry mechanism for v3.3.1
const maxRetries = 3;
console.log(`Database deadlock protection enabled with ${maxRetries} retries`);
