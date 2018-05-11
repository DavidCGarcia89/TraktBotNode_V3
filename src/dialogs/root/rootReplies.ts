import { Message, Session, AttachmentLayout, HeroCard, CardAction, Prompts, SuggestedActions, IIntentRecognizerResult } from 'botbuilder';
import { IUser } from 'botauth/lib';
import { Show, Episode, Season } from '../../model';
import * as traktTv from '../../services/traktTv';

export function onHi (session: Session) {
    session.send(new Message(session)
        .text("Hi there! What can I do for you today?")
        .suggestedActions(getSuggestedActions(session)));
}

export function onThx(session: Session) {
    session.send('You are welcome');
}

export function onBye(session: Session) {
    session.send('Good bye!');
}

export async function onTrending(session: Session) {
    let shows: Show[];
    try {
        shows = await traktTv.getTrendingShows();
    } catch (e) {
        onTraktTvError(session, e);
        return;
    }

    sendShows(session, 'These are the trending shows right now:', shows);
    whatNow(session);
}

export async function onPopular(session: Session) {
    let shows: Show[];
    try {
        shows = await traktTv.getPopularShows();
    } catch (e) {
        onTraktTvError(session, e);
        return;
    }

    sendShows(session, 'These are the most popular shows at the moment:', shows);
    whatNow(session);
}

export function promptForPersonalizedRecommendationsConfirmation(session: Session) {
    session.beginDialog('prompt.confirmation', 'Do you want personalized recommendations?');
}

export async function onPersonalizedRecommendations(session: Session, user: IUser) {
    let shows: Show[];
    try {
        shows = await traktTv.getRecommendedShows(user.accessToken);
    } catch (e) {
        onTraktTvError(session, e);
        return;
    }

    sendShows(session, `${user.id}, these are my recommendations for you:`, shows);
    whatNow(session);
}

export function promptForShowToSearch(session: Session, luisResults: IIntentRecognizerResult) {
    session.beginDialog('findShow', {
        question: 'Please, tell me the name of the show you are looking for',
        luisResults: luisResults });
}

export async function onShowFound(session: Session, show: Show, showStatusOnly?: boolean) {
    if (showStatusOnly) {
        sendStatus(session, show.status);
    } else {
        sendShows(session, 'Here you have it:', [show]);
    }
    whatNow(session);
}

export function promptForWatchedShow(session: Session, luisResults: IIntentRecognizerResult) {
    session.beginDialog('findShow', {
        question: 'Tell me the name of the show which episode you watched',
        luisResults: luisResults });
}

export function promptForWatchedSeason(session: Session) {
    session.beginDialog('prompt.number', 'Tell me the season number of the episode that you watched');
}

export function promptForWatchedEpisode(session: Session) {
    session.beginDialog('prompt.number', 'Tell me the episode number that you watched');
}

export async function onWatched(session: Session, user: IUser, show: Show, episodeDetails: Episode) {
    let seasons: Season[];
    try {
        seasons = await traktTv.getSeasons(show.ids.trakt);
    } catch (e) {
        onTraktTvError(session, e);
        return;
    }

    const season = seasons.find(s => s.number === episodeDetails.season);
    if (!season) {
        session.send(`I couldn't find season ${episodeDetails.season} for '${show.title}'`);
        whatNow(session);
        return;
    }

    const episode = season.episodes.find(e => e.number === episodeDetails.number);
    if (!episode) {
        session.send(`I couldn't find episode ${episodeDetails.season}x${episodeDetails.number} for show '${show.title}'`);
        whatNow(session);
        return;
    }

    // TODO: Add watched episode for authenticated user
    session.send(`COMING SOON ${user.id}! Watched episode ${episodeDetails.season}x${episodeDetails.number} of ${show.title} `);
    whatNow(session);
}

export function onLogout(session: Session, user: IUser) {
    if (user) {
        session.send(`You have been logged out ${user.id}!`);
    } else {
        session.send('You are not logged in!');
    }
    whatNow(session);
}

export function onUnknown(session: Session) {
    session.send(`Sorry, I didn't understand '${session.message.text}'.`);
    whatNow(session);
}

export function onCancel(session: Session) {
    session.send('Sure thing!');
    whatNow(session);
}

export function onTraktTvError(session: Session, e: Error) {
    session.send(`Oops! Something went wrong while connecting to trakt.tv service: *${e.message}*`);
    whatNow(session);
}

function whatNow(session: Session) {
    session.send(new Message(session)
        .text("What else can I do for you?")
        .suggestedActions(getSuggestedActions(session)));
}

function getSuggestedActions(session: Session) {
    return SuggestedActions.create(session, [
        CardAction.imBack(session, "Trending shows", "Trending shows"),
        CardAction.imBack(session, "Popular shows", "Popular shows"),
        CardAction.imBack(session, "Recommend shows", "Recommend shows"),
        CardAction.imBack(session, "Search show", "Search show"),
        CardAction.imBack(session, "Show status", "Show status"),
        CardAction.imBack(session, "Episode watched", "Episode watched")]);
}

function sendStatus(session: Session, status: string) {
    switch (status) {
        case 'ended': session.send('This show has ended'); break;
        case 'returning series': session.send('This show is returning'); break;
        case 'canceled': session.send('This show has been canceled'); break;
        case 'in production': session.send('This show is in production'); break;
        default:
            session.send(`The status of this show is: ${status}`);
    }
}

function sendShows(session: Session, text: string, shows: Show[]) {
    session.send(new Message(session)
        .text(text)
        .attachmentLayout(AttachmentLayout.carousel)
        .attachments(shows.map(show => toHeroCard(session, show))));
}

function toHeroCard(session: Session, show: Show) {
    return new HeroCard(session)
        .title(show.title)
        .subtitle(show.status)
        .text(show.overview)
        .buttons([CardAction.openUrl(session, `https://trakt.tv/shows/${show.ids.trakt}`, "Trakt.tv")]);
}