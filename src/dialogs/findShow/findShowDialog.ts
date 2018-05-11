import { LuisRecognizer, IntentDialog, Session, EntityRecognizer } from 'botbuilder';
import * as replies from './findShowReplies';

export class FindShowDialog extends IntentDialog {

    constructor(luisRecognizer: LuisRecognizer) {
        super({ recognizers: [luisRecognizer] });
        this.onBegin(this.onBeginDialog)
            .matches('Command.Cancel', replies.onCancel)
            .onDefault(this.onAnythingElse);
    }

    private onBeginDialog(session: Session, args: any) {
        const showEntity = EntityRecognizer.findEntity(args.luisResults.entities, 'Show');
        replies.onBegin(session, args.question, showEntity && this.fixShowName(showEntity.entity));
    }

    private async onAnythingElse(session: Session) {
        replies.onShow(session, session.message.text);
    }

    private fixShowName(showName: string) : string {
        return showName.replace(" '", "'").replace("' ", "'"); // LUIS messes up entity values containing apostrophes
    }
}