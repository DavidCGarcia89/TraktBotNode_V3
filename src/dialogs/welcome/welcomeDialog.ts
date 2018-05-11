import { Session } from 'botbuilder';
import * as replies from './welcomeReplies';

export function onWelcomeDialog(session: Session) {
    replies.onUserConnected(session);
}
