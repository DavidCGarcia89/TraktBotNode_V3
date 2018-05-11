export interface Show {
    title: string;
    overview: string;
    status: string;
    ids?: Ids;
}

export interface Season {
    number: number;
    ids?: Ids;
    episodes: Episode[];
}

export interface Episode {
    season: number;
    number: number;
    ids?: Ids;
}

interface Ids {
    trakt: number;
}