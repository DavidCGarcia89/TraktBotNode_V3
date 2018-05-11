import { Session } from 'botbuilder';

export function onNotification(session: Session) {
    session.send('Hi, this is a notification');
    session.endDialog();
}