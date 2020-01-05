import APP_CONFIG from '../src/app/app.config';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Character, APICharacter } from '../src/app/api/character';

interface HeroAPIResponse<T> {
  data: { results: T[] };
}
type GroupName = string;

@Injectable({
  providedIn: 'root'
})
export class HeroesApiService {
  private baseSuperHeroUrl = APP_CONFIG.USE_CACHE ? '/heroes/' : 'https://www.superheroapi.com/api.php/2470261009752468/search';
  private charsToGroupsMap = new Map<string, Set<string>>();
  private groupsToCharsId = new Map<string, Set<string>>();
  constructor(private http: HttpClient) {
    // this.getAllCharacters();
  }

  getCharacterGroups = (groupsDescription: string): Set<GroupName> => {
    const commentsRegex = /\(.*?\)|(former(ly)? )/gi;
    const groupRegex = /([A-Z][\w\s\-]+)/g;
    const groupsRawString: string = groupsDescription.replace(commentsRegex, '');
    const groupsWithSpaces: string[] = groupsRawString.match(groupRegex) || [];
    const groups: GroupName[] = groupsWithSpaces.map(x => x.trim())
    return new Set<GroupName>(groups);
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
    const extractCharAffiliations = character =>
      this.charsToGroupsMap.set(
        character.name,
        this.getCharacterGroups(character.connections['group-affiliation'])
      );
    const extractCharacterAffiliations = (charactersData: APICharacter[]) =>
      charactersData.forEach(extractCharAffiliations);
    this.http.get<APICharacter[]>(this.baseSuperHeroUrl)
      .toPromise()
      .then(extractCharacterAffiliations);
      // .then(_ => {console.log(this.charsToGroupsMap); [...this.charsToGroupsMap.keys()].forEach(x => console.log(x)); });
  }
}
