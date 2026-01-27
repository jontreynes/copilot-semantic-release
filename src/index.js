const core = require('@actions/core');

const person = core.getInput('person');

console.log(`Hey, welcome ${person}! Here's a test part 7 - urgent hotfix applied`);

// Hotfix v3.6.7: Added urgent fix
console.log('Urgent fix applied successfully! deploy to stage2');
