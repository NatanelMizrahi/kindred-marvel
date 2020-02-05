export type CharacterId = number;
export type EventId = number;
export type TeamName = string;
export interface CharIdObject {
  id: number;
}

export interface APICharacter {
    id: CharacterId;
    name: string;
    description?: string;
    thumbnail?: {
        path: string,
        extension: string
    };
    urls?: Array<{
        type: string,
        url: string
    }>;
    events?: {
        items: Array<{
            resourceURI: string,
            name: string
        }>;
    };
    aliases?: string[];
    alliances?: string[];
    powers?: string[];
    alignment?: string;
    full_name?: string;
    type?: string;
}

export interface APIEvent {
  id: number;
  title: string;
  description: string;
  characters: {
    available: number;
    items: CharIdObject[];
  };
  thumbnail: {
    path: string;
    extension: string;
  };
  urls: Array<{
    type: string,
    url: string
  }>;
}
