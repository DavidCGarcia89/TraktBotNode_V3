import { Message, Session, AttachmentLayout, HeroCard, CardAction, Prompts, SuggestedActions, ResumeReason } from 'botbuilder';

export function onBegin(session: Session, question: string) {
    session.send(new Message(session)
        .text(question)
        .suggestedActions(getSuggestedActions(session)));
}

export function onUnknown(session: Session) {
    session.send(new Message(session)
        .text(`Sorry, I didn't understand '${session.message.text}'. Please, just answer the question`)
        .suggestedActions(getSuggestedActions(session)));
}

export function onYes(session: Session) {
    session.endDialogWithResult({ response: true });
}

export function onNo(session: Session) {
    session.endDialogWithResult({ response: false });
}

export function onCancel(session: Session) {
    session.endDialogWithResult({ resumed: ResumeReason.canceled });
}

function getSuggestedActions(session: Session) {
    return SuggestedActions.create(session, [
        CardAction.imBack(session, 'Yes', 'Yes'),
        CardAction.imBack(session, 'No', 'No'),
        CardAction.imBack(session, 'Cancel', 'Cancel')]);
}