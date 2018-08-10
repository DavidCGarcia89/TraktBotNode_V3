import { Session, LuisRecognizer, IntentDialog, EntityRecognizer, Dialog, IDialogWaterfallStep, IDialogResult, IIntentRecognizerResult, ResumeReason } from 'botbuilder';
import { BotAuthenticator } from 'botauth/lib';
import * as replies from './rootReplies';
import { Episode } from '../../model';

export class RootDialog extends IntentDialog {

    constructor(luisRecognizer: LuisRecognizer, authenticator: BotAuthenticator) {
        super({ recognizers: [luisRecognizer] });
        this.matches('Education.Hi', replies.onHi)
            .matches('Education.Thx', replies.onThx)
            .matches('Education.Bye', replies.onBye)
            .matches('Shows.Trending', replies.onTrending)
            .matches('Shows.Popular', replies.onPopular)
            .matches('Shows.Recommendations', this.onRecommendations(authenticator))
            .matches('Shows.Search', this.onSearch())
            .matches('Shows.Status', this.onSearch(true))
            .matches('Shows.Watched', this.onWatched(authenticator))
            .matches('Command.Cancel', replies.onCancel)
            .matches('Command.Logout', this.onLogout(authenticator))
            .onDefault(replies.onUnknown);
    }

    private onRecommendations(authenticator: BotAuthenticator) : IDialogWaterfallStep[] {
        return [].concat(
            function (session: Session) {
                replies.promptForPersonalizedRecommendationsConfirmation(session);
            },
            async function (session: Session, results: IDialogResult<any>, next: (results?: IDialogResult<any>) => void) {
                switch (results.response) {
                    case true: next(); break;
                    case false: await replies.onPopular(session); break;
                    default: await replies.onCancel(session); break;
                }
            },
            authenticator.authenticate('trakt', {}),
            async function (session: Session) {
                const user = authenticator.profile(session, 'trakt');
                await replies.onPersonalizedRecommendations(session, user);
            }
        );
    }

    private onSearch(showStatusOnly?: boolean) : IDialogWaterfallStep[] {
        return [].concat(
            replies.promptForShowToSearch,
            async function (session: Session, results: IDialogResult<any>) {
                if (results.response) {
                    replies.onShowFound(session, results.response, showStatusOnly);
                } else if (results.resumed === ResumeReason.canceled) {
                    replies.onCancel(session);
                } else {
                    replies.onTraktTvError(session, results.error);
                }
            });
    }

    private onWatched(authenticator: BotAuthenticator) : IDialogWaterfallStep[] {
        return [].concat(
            function (session: Session, luisResults: IIntentRecognizerResult, next: (results?: IDialogResult<any>) => void) {
                session.dialogData.luisResults = luisResults;

                const episodeEntity = EntityRecognizer.findEntity(luisResults.entities, 'Episode');
                const episode = episodeEntity && RootDialog.extractEpisode(episodeEntity.entity);
                let seasonNumber = episode && episode.season;
                let episodeNumber = episode && episode.number;
                if (!episode) {
                    const seasonNumberEntity = EntityRecognizer.findEntity(luisResults.entities, 'Episode::SeasonNumber');
                    seasonNumber = seasonNumberEntity && seasonNumberEntity.entity;
                    const episodeNumberEntity = EntityRecognizer.findEntity(luisResults.entities, 'Episode::EpisodeNumber');
                    episodeNumber = episodeNumberEntity && episodeNumberEntity.entity;
                }

                session.dialogData.episode = {
                    season: seasonNumber,
                    number: episodeNumber
                };
                next();
            },
            authenticator.authenticate('trakt', {}),
            function (session: Session, ignore: any, next: (results?: IDialogResult<any>) => void) {
                const user = authenticator.profile(session, 'trakt');
                session.dialogData.user = user;
                next();
            },
            function(session: Session) {
                replies.promptForWatchedShow(session, session.dialogData.luisResults);
            },
            function (session: Session, results: IDialogResult<any>, next: (results?: IDialogResult<any>) => void) {
                if (results.response) {
                    session.dialogData.show = results.response;
                    if (!session.dialogData.episode.season) {
                        replies.promptForWatchedSeason(session);
                    } else {
                        next({ response: +session.dialogData.episode.season});
                    }
                } else if (results.resumed === ResumeReason.canceled) {
                    replies.onCancel(session);
                } else {
                    replies.onTraktTvError(session, results.error);
                }
            },
            function (session: Session, results: IDialogResult<any>, next: (results?: IDialogResult<any>) => void) {
                if (typeof results.response === 'number') {
                    session.dialogData.episode.season = results.response;
                    if (!session.dialogData.episode.number) {
                        replies.promptForWatchedEpisode(session);
                    } else {
                        next({ response: +session.dialogData.episode.number});
                    }
                } else {
                    replies.onCancel(session);
                }
            },
            async function (session: Session, results: IDialogResult<any>) {
                if (typeof results.response === 'number') {
                    session.dialogData.episode.number = results.response;
                    await replies.onWatched(session, session.dialogData.user, session.dialogData.show, session.dialogData.episode);
                    session.dialogData.episode = null;
                } else {
                    replies.onCancel(session);
                }
            }
        );
    }

    private onLogout(authenticator: BotAuthenticator) : IDialogWaterfallStep {
        return function (session: Session, luisResults: IIntentRecognizerResult, next: (results?: IDialogResult<any>) => void) {
                const user = authenticator.profile(session, 'trakt');
                if (user) {
                    authenticator.logout(session, 'trakt');
                }
                replies.onLogout(session, user);
            };
    }

    private static fixShowName(showName: string) : string {
        return showName.replace(" ' ", "'"); // LUIS messes up entity values containing apostrophes
    }

    private static extractEpisode(seasonAndEpisode: string) : Episode {
        if (/^s\d+e\d+$/i.test(seasonAndEpisode) || /^\d+x\d+$/i.test(seasonAndEpisode)) {
            const regex = /\d+/g;
            return {
                season: +regex.exec(seasonAndEpisode),
                number: +regex.exec(seasonAndEpisode)
            };
        }
    }
}