import { LuisRecognizer, IntentDialog, Session } from 'botbuilder';
import * as replies from './numberReplies';

export class NumberDialog extends IntentDialog {
    constructor(luisRecognizer: LuisRecognizer) {
        super({ recognizers: [luisRecognizer] });
        this.onBegin(replies.onBegin)
            .matches('Command.Cancel', replies.onCancel)
            .onDefault(this.onAnythingElse);
    }

    private onAnythingElse(session: Session) {
        const number = parseInt(session.message.text);
        if (!isNaN(number)) {
            replies.onNumber(session, number);
        } else {
            replies.onUnknown(session);
        }
    }
}