const fuzzySet = require('fuzzyset.js')

class fuzzyMap {
  constructor(threshold, useLevenshtein = true) {
    this.threshold = threshold;
    this.fuzzySet = new fuzzySet([],useLevenshtein);
    this.map = new Map();
  }
  set(key, value){
    this.fuzzySet.add(key);
    this.map.set(key,value);
  }
  get(originalKey, verbose = true){
    let fuzzySetMatches = null;
    for (const key of [originalKey, ...this.synonyms(originalKey)]){
      fuzzySetMatches = this.fuzzySet.get(key);
      if (fuzzySetMatches !== null){
        verbose && console.log(fuzzySetMatches);
        let [confidence, topMatch] = [...fuzzySetMatches[0]];
        if (confidence >= this.threshold) {
          let value = this.map.get(topMatch)
          verbose && console.log(`${originalKey}=~${topMatch} => ${value} (${(confidence * 100).toFixed(1)}%)`);
          return value;
        }
      }
    }
    verbose && console.log('No match found for: ' + originalKey);
    return null;
  }
  synonyms(original) {
    const synonyms = {
      // TODO: expand
      'Mr.': 'Mister',
      'Ms.': 'Miss'
    };
    let variation = original;
    for (const key in synonyms){
      variation = variation.replace(key, synonyms[key])
    }
    return variation === original ? [] : [variation];
  }
}
module.exports = fuzzyMap;
