import { LuisRecognizer, IntentDialog } from 'botbuilder';
import * as replies from './confirmationReplies';

export class ConfirmationDialog extends IntentDialog {

    constructor(luisRecognizer: LuisRecognizer) {
        super({ recognizers: [luisRecognizer] });
        this.onBegin(replies.onBegin)
            .matches('Confirmation.Yes', replies.onYes)
            .matches('Confirmation.No', replies.onNo)
            .matches('Command.Cancel', replies.onCancel)
            .onDefault(replies.onUnknown);
    }
}