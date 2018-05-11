import { config }  from './config';
import * as restify from 'restify';
import { IServer } from 'botauth/lib/interfaces';
import { ChatConnector, UniversalBot, Message, LuisRecognizer, Session } from 'botbuilder';
import { DocumentDbClient, AzureBotStorage } from '@sheerun/botbuilder-azure'; // Bug in botbuilder-azure when using ts: https://github.com/Microsoft/BotBuilder-Azure/pull/55
import { BotAuthenticator } from 'botauth';
import { Strategy } from 'passport-trakt';
import * as cosmosDB from './services/cosmosDB';
import * as logger from './services/logger';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { RootDialog } from './dialogs/root/rootDialog';
import { ConfirmationDialog } from './prompts/confirmation/confirmationDialog';
import { NumberDialog } from './prompts/number/numberDialog';
import { onWelcomeDialog } from './dialogs/welcome/welcomeDialog';
import { onProactiveDialog } from './dialogs/proactive/proactiveDialog';
import { FindShowDialog } from './dialogs/findShow/findShowDialog';

const connector = createChatConnector();
const bot = createBot(connector);
const server = createServer(connector, bot);
const recognizer = createRecognizer();
const authenticator = createAuthenticator(bot, server);
setupBotInstrumentation(bot, recognizer);
setupBotLocalization(bot);
setupBotStateStorage(bot);
setupBotDialogs(bot, recognizer, authenticator);

function createChatConnector() : ChatConnector {
    return new ChatConnector({
        appId: config.get('MicrosoftAppId'),
        appPassword: config.get('MicrosoftAppPassword'),
        openIdMetadata: config.get('BotOpenIdMetadata')
    });
}

function createBot(connector: ChatConnector) : UniversalBot {
    return new UniversalBot(connector);
}

function createServer(connector: ChatConnector, bot: UniversalBot) : IServer {
    const server = restify.createServer();
    server.use(restify.plugins.queryParser());
    server.listen(process.env.port || process.env.PORT || 3977, function () {
        console.log('%s listening to %s', server.name, server.url);
    });

    server.post('/api/messages', connector.listen());

    server.get('/api/proactive', async function (req: any, res: any, next: any) {
        if (res.req.query) {
            try {
                const address = await cosmosDB.findAddress(res.req.query.id);
                bot.beginDialog(address, 'proactive');
                res.send('user notified');
            } catch (ex) {
                console.log(ex);
            }
        }
        next();
    });

    return server;
}

function createRecognizer() : LuisRecognizer {
    return new LuisRecognizer(
        config.get('LUIS_apiHostName') + '/' +
        config.get('LUIS_appId') + '?subscription-key=' +
        config.get('LUIS_apiKey') + '&q=');
}

function createAuthenticator(bot: UniversalBot, server: IServer) : BotAuthenticator {
    const auth = new BotAuthenticator(server, bot, { baseUrl: config.get('WEBSITE_host'), secret: config.get('BOTAUTH_secret') });
    auth.provider('trakt', options => {
        return new Strategy({ // https://www.npmjs.com/package/passport-trakt
            clientID: config.get('TRAKTTV_clientId'),
            clientSecret: config.get('TRAKTTV_clientSecret'),
            callbackURL : options.callbackURL
        }, (accessToken, refreshToken, profile, done) => {
            profile = profile || {};
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        });
    });
    return auth;
}

function setupBotLocalization(bot: UniversalBot) {
    bot.set('localizerSettings', {
        botLocalePath: "./locale",
        defaultLocale: "en"
    });
}

function setupBotInstrumentation(bot: UniversalBot, recognizer: LuisRecognizer) : BotFrameworkInstrumentation {
    bot.use({
        botbuilder: logger.onMessageReceived,
        send: logger.onMessageSent
    });

    const instrumentation = new BotFrameworkInstrumentation({
        instrumentationKey: config.get('BotDevAppInsightsKey'),
        sentiments: {
            key: config.get('CG_SENTIMENT_KEY')
        },
        autoLogOptions: {
            autoCollectExceptions: true
            }
        });
    instrumentation.monitor(bot, recognizer);
}

function setupBotStateStorage(bot: UniversalBot) {
    const cosmosDbClient = new DocumentDbClient({
        host: config.get('COSMOSDB_host'),
        masterKey: config.get('COSMOSDB_key'),
        database: 'botdocs',
        collection: 'botdata'
    });
    const storage = new AzureBotStorage({ gzipData: false }, cosmosDbClient);
    bot.set('storage', storage);
}

function setupBotDialogs(bot: UniversalBot, recognizer: LuisRecognizer, authenticator: BotAuthenticator) {
    bot.dialog('welcome', onWelcomeDialog);
    bot.dialog('/', async function(session: Session) {
        session.preferredLocale("en");
        await cosmosDB.storeAddress(session.message.address);
        session.replaceDialog('root');
    });
    bot.dialog('root', new RootDialog(recognizer, authenticator));
    bot.dialog('findShow', new FindShowDialog(recognizer));
    bot.dialog('prompt.confirmation', new ConfirmationDialog(recognizer));
    bot.dialog('prompt.number', new NumberDialog(recognizer));
    bot.dialog('proactive', onProactiveDialog);
    bot.on('conversationUpdate', (message) => {
        if (message.membersAdded.find(m => m.id === message.user.id)) {
            bot.beginDialog(message.address, 'welcome');
        }
    });
}