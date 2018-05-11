import { Session, Message, AttachmentLayout, HeroCard, CardAction, SuggestedActions, ResumeReason } from 'botbuilder';
import { Show } from '../../model';
import * as traktTv from '../../services/traktTv';

const traktIdPrefix: string = 'traktId:';

export function onBegin(session: Session, question: string, showName: string) {
    if (!showName) {
        session.send(new Message(session)
            .text(question)
            .suggestedActions(getSuggestedActions(session)));
    } else {
        findShow(session, showName);
    }
}

export function onCancel(session: Session) {
    session.endDialogWithResult( { resumed: ResumeReason.canceled } );
}

export async function onShow(session: Session, showName: string) {
    if (showName.startsWith(traktIdPrefix)) {
        const traktId = parseInt(showName.replace(traktIdPrefix, ''));
        if (traktId) {
            let show: Show;
            try {
                show = await traktTv.getShowSummary(traktId);
            } catch (e) {
                onTraktTvError(session, e);
                return;
            }

            session.endDialogWithResult({ response: show });
            return;
        }
    }

    findShow(session, showName);
}

async function findShow(session: Session, showName: string) {
    showName = showName.toLowerCase();
    let shows: Show[];
    try {
        shows = await traktTv.searchShows(showName);
    } catch (e) {
        onTraktTvError(session, e);
        return;
    }

    const show = shows.find(s => s.title.toLowerCase() === showName);
    if (show) {
        session.endDialogWithResult({ response: show });
    } else if (shows.length > 0) {
        sendShows(session, "I couldn't find any show with that exact name, but I found shows with similar names. Please select one or enter a new show name:", shows);
    } else {
        session.send(new Message(session)
            .text(`I couldn't find a show with name '${showName}'. Please enter a new name`)
            .suggestedActions(getSuggestedActions(session)));
    }
}

function sendShows(session: Session, text: string, shows: Show[]) {
    session.send(new Message(session)
        .text(text)
        .attachmentLayout(AttachmentLayout.carousel)
        .attachments(shows.map(show => toHeroCard(session, show)))
        .suggestedActions(getSuggestedActions(session)));
}

function toHeroCard(session: Session, show: Show) {
    return new HeroCard(session)
        .title(show.title)
        .buttons([CardAction.postBack(session, `${traktIdPrefix}${show.ids.trakt}`, 'Select')]);
}

function getSuggestedActions(session: Session) {
    return SuggestedActions.create(session, [CardAction.imBack(session, 'Cancel', 'Cancel')]);
}

function onTraktTvError(session: Session, e: Error) {
    session.endDialogWithResult( { resumed: ResumeReason.notCompleted, error: e } );
}