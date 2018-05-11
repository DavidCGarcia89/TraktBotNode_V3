import { Session } from 'botbuilder';
import * as replies from './proactiveReplies';

export function onProactiveDialog(session: Session) {
    replies.onNotification(session);
}