import APP_CONFIG from "../app.config";

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Md5 } from "ts-md5/dist/md5";
import { catchError, map } from "rxjs/operators";
import { forkJoin, of, throwError } from "rxjs";
import { Filter } from "./filter";
import { Character } from "./character";
import { flatten } from "@angular/compiler";
import {
  charsI,
  charsE,
  charsA,
  charsO,
  charsU,
  charsX,
  charsY
} from "../../assets/test-db/superhero-db";
interface HeroAPIResponse<T> {
  data: { results: T[] };
}

@Injectable({
  providedIn: "root"
})
export class HeroApiService {
  private baseURL =
    "https://www.superheroapi.com/api.php/2470261009752468/search/";
  private charsToGroupsMap = new Map<string, Set<string>>();
  private groupsToCharsId = new Map<string, Set<string>>();
  constructor(private http: HttpClient) {
    this.buildDB();
  }

  makeSetGroupsofChar = (groups: string) => {
    const groupsWithNoParentheses = groups.replace(/\(.*?\)/g, "");
    const groupsAsArray =
      groupsWithNoParentheses.match(/([A-Z][\w\s\-]+)/g) || [];

    // let groupsSet = new Set<string>();
    // for (let group in groupsAsArray) {
    //   groupsSet.add(group.trim());
    // }
    // console.log(groupsAsArray);
    return new Set<string>(groupsAsArray.map(x => x.trim()));
  };

  private buildDB = () => {
    if (APP_CONFIG.TEST_MODE) {
      let charsArray = [
        ...charsA.results,
        ...charsE.results,
        ...charsI.results,
        ...charsO.results,
        ...charsU.results,
        ...charsY.results,
        ...charsX.results
      ];
      for (let char of charsArray) {
        if (!this.charsToGroupsMap.has(char.name)) {
          this.charsToGroupsMap.set(
            char.name,
            this.makeSetGroupsofChar(char.connections["group-affiliation"])
          );
        }
      }
    }
  };
  addGroups(char: Character) {}

  private apiUrl(searchTerm, filter: Filter = {}) {
    return this.baseURL + searchTerm;
  }

  private apiGet(search, filter: Filter = {}) {
    return this.http
      .get<HeroAPIResponse<any>>(this.apiUrl(search, filter))
      .pipe(map(res => res.data.results));
  }
}
