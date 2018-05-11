import axios from 'axios'; // https://github.com/axios/axios
import { config } from '../config';
import { Show, Season } from '../model';

enum ExtendedInfo { Min = "min", Full = "full", Episodes = "episodes", FullWithEpisodes = "fullwithepisodes"}

export async function getTrendingShows() : Promise<Show[]> {
    const results = await get('shows/trending', {
        'extended' : ExtendedInfo.Full
    });
    return results.map(result => result.show);
}

export async function getPopularShows() : Promise<Show[]> {
    return await get('shows/popular', { 'extended' : ExtendedInfo.Full });
}

export async function getRecommendedShows(authToken: string) : Promise<Show[]> {
    return await get('recommendations/shows', { 'extended' : ExtendedInfo.Full }, authToken);
}

export async function searchShows(query: string) : Promise<Show[]> {
    const results = await get('search', {
        'query': query,
        'type': 'show',
        'extended': ExtendedInfo.Min
    });
    return results.map(result => result.show);
}

export async function getShowSummary(traktId: number) : Promise<Show> {
    return await get(`shows/${traktId}`, {'extended': ExtendedInfo.Full });
}

export async function getSeasons(traktId: number) : Promise<Season[]> {
    return await get(`shows/${traktId}/seasons`, {'extended': ExtendedInfo.Episodes });
}

async function get<T>(api : string, params: any, authToken?: string) : Promise<any> {
    const result = await axios({
        method: 'get',
        baseURL: 'https://api-v2launch.trakt.tv',
        url: api,
        params: params,
        headers: {
            'trakt-api-key' : config.get('TRAKTTV_clientId'),
            'trakt-api-version' : '2',
            'authorization': authToken ? `Bearer ${authToken}` : ''
        }
    });
    return result.data;
}