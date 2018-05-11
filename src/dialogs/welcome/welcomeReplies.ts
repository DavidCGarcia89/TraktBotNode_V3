import { Session } from 'botbuilder';

export function onUserConnected(session: Session) {
    session.send('welcome.userConnected');
    session.endDialog();
}