import { Message, Session, AttachmentLayout, HeroCard, CardAction, Prompts, SuggestedActions, ResumeReason } from 'botbuilder';

export function onBegin(session: Session, question: string) {
    session.send(new Message(session)
        .text(question)
        .suggestedActions(getSuggestedActions(session)));
}

export function onCancel(session: Session) {
    session.endDialogWithResult( { resumed: ResumeReason.canceled });
}

export function onNumber(session: Session, number: number) {
    session.endDialogWithResult({ response: number });
}

export function onUnknown(session: Session) {
    session.send(new Message(session)
        .text(`Sorry, '${session.message.text}' is not a valid number. Please, enter a valid number`)
        .suggestedActions(getSuggestedActions(session)));
}

function getSuggestedActions(session: Session) {
    return SuggestedActions.create(session, [CardAction.imBack(session, 'Cancel', 'Cancel')]);
}