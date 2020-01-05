const fuzzySet = require('fuzzyset.js')
//bitwise constants for verbosity
const NAN = 0;
const ERR = 1;
const LOG = 2;
const DBG = 4;

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
  get(key, verbosity = NAN) {
    // console.log(key);
    return Array.isArray(key) ?
      this.getKeysArray(key, verbosity):
      this.getSingleKey(key, verbosity);
  }
  getKeysArray(keysArray, verbosity){
    let fuzzySetMatches = null;
    let matchingKey = null;
    let bestMatch = null;
    let maxConfidence = 0;
    const alternativeOptions = keysArray.map(this.replaceSynonyms).flat();
    const options = [...keysArray, ...alternativeOptions];
    for (const key of options){
      fuzzySetMatches = this.fuzzySet.get(key);
      if (fuzzySetMatches !== null){
        (verbosity & DBG) && console.log(fuzzySetMatches);
        let [confidence, currTopMatch] = [...fuzzySetMatches[0]];
        if (confidence >= this.threshold && confidence > maxConfidence) {
          bestMatch = this.map.get(currTopMatch);
          maxConfidence = confidence;
          matchingKey = key;
          if (confidence === 1)
            break;
        }
      }
    }
    if(bestMatch){
      if(verbosity & LOG)
        console.log(`${matchingKey}=~${bestMatch} => ${value} (${(maxConfidence * 100).toFixed(1)}%)`);
      return bestMatch;
    }
    else{
      (verbosity & ERR) && console.log('No match found for: ' + keysArray.join('|'));
      return null;
    }
  }

  getSingleKey(originalKey, verbosity){
    let fuzzySetMatches = null;
    for (const key of [originalKey, ...this.replaceSynonyms(originalKey)]){
      fuzzySetMatches = this.fuzzySet.get(key);
      if (fuzzySetMatches !== null){
        (verbosity & DBG) && console.log(fuzzySetMatches);
        let [confidence, topMatch] = [...fuzzySetMatches[0]];
        if (confidence >= this.threshold) {
          let value = this.map.get(topMatch);
          (verbosity & LOG) && console.log(`${originalKey}=~${topMatch} => ${value} (${(confidence * 100).toFixed(1)}%)`);
          return value;
        }
      }
    }
    (verbosity & ERR) && console.log('No match found for: ' + originalKey);
    return null;
  }
  replaceSynonyms(original) {
    const synonyms = {
      // TODO: expand
      'Mr.': 'Mister',
      'Ms.': 'Miss',
      'Dr.': 'Doctor'
    };
    let variation = original;
    for (const key in synonyms){
      variation = variation.replace(key, synonyms[key])
    }
    return variation === original ? [] : [variation];
  }
}

module.exports = fuzzyMap;
