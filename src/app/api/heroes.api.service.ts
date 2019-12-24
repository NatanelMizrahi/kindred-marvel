import APP_CONFIG from '../app.config';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Filter } from './filter';
import { Character } from './character';
interface HeroAPIResponse<T> {
  data: { results: T[] };
}

@Injectable({
  providedIn: 'root'
})
export class HeroesApiService {
  private baseSuperHeroUrl = APP_CONFIG.USE_CACHE ? '/heroes/' : 'https://www.superheroapi.com/api.php/2470261009752468/search';
  private charsToGroupsMap = new Map<string, Set<string>>();
  private groupsToCharsId = new Map<string, Set<string>>();
  constructor(private http: HttpClient) {
    // this.buildDB();
    this.getAllCharacters();
  }

  makeSetGroupsofChar = (groupsDescription: string) => {
    const commentsRegex = /\(.*?\)/g;
    const groupRegex = /([A-Z][\w\s\-]+)/g;
    const groupsRawString: string = groupsDescription.replace(commentsRegex, '');
    const groupsWithSpaces: string[] = groupsRawString.match(groupRegex) || [];
    const groups = groupsWithSpaces.map(x => x.trim())
    return new Set<string>(groups);
  }
  addGroups(char: Character) {}

  private apiUrl(searchTerm) {
    return this.baseSuperHeroUrl + '/' + searchTerm;
  }

  private apiGet(search) {
    return this.http
      .get<HeroAPIResponse<any>>(this.apiUrl(search))
      .pipe(map(res => res.data.results));
  }

  private getAllCharacters() {
    const extractCharAffiliations = character => {
      this.charsToGroupsMap.set(character.name,
        this.makeSetGroupsofChar(character.connections['group-affiliation'])
      );
    }
    const extractCharacterAffiliations = (charactersData: any[]) => charactersData
      .forEach(extractCharAffiliations);
    this.http.get<any[]>(this.baseSuperHeroUrl)
      .subscribe(extractCharacterAffiliations);
  }
}
