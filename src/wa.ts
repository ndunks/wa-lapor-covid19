import { Page } from "puppeteer";
import { Whatsapp, SocketState, PartialMessage, Message } from "sulla";
import { CreateConfig } from "sulla/dist/config/create-config";
import { initWhatsapp, injectApi } from "sulla/dist/controllers/browser";
import { isAuthenticated } from "sulla/dist/controllers/auth";
import * as fs from "fs";
import * as path from "path";


let STATE: 'starting' | 'need_login' | 'logged_in' | SocketState = 'starting'
let waPage: Page = null
let client: Whatsapp = null
interface MessageHandler {
    name: string
    matcher: RegExp | ((msg: PartialMessage) => boolean)
    info: string
    format?: string
    contoh?: string
    hidden?: boolean
    reply(msg: PartialMessage | Message, client: Whatsapp): Promise<any>
}

const wa_handlers: MessageHandler[] = []
const handlerPath = path.join(__dirname, 'wa-handler')
fs.readdirSync(handlerPath).forEach(
    f => {
        wa_handlers.push(require(path.join(handlerPath, f)).default)
    }
)
logger("Wa Handler:", wa_handlers.map(v => v.name))
const options: CreateConfig = {
    headless: true,
    devtools: false,
    useChrome: false,
    debug: false,
    logQR: false,
    browserArgs: ['--no-sandbox'],
    refreshQR: 30000,
}

function findHandler(msg) {
    const firstLine = (msg || "").split(/\s/, 2)[0]
        .replace(/^[\`\*_]+/g, '');
    return wa_handlers.find(
        v => v.matcher instanceof RegExp ?
            v.matcher.test(firstLine) : v.matcher(msg as PartialMessage)
    )
}

function processMessage(msg: PartialMessage | Message): Promise<any> {

    if (msg.type != 'chat' || msg['isMedia']) {
        logger("Ignore message from", msg.from, msg.type)
        return;
    }
    const handler = findHandler(msg.body)

    if (handler) {
        try {
            return handler.reply(msg, client)
        } catch (error) {
            if (typeof error == 'string') {
                return client.sendText(msg.from, error)
            } else {
                return client.sendText(msg.from, 'Mohon maaf, terjadi kesalahan di sistem kami.')
            }

        }
    } else {
        let replyMessage = ''
        if (msg.body.length < 30) {
            replyMessage += `Perintah '_${msg.body}_' tidak dikenali. `
        }
        replyMessage += 'untuk cara melaporkan pendatang, silahkan ketik: ```help lapor```.\nWebsite: http://klampok.id\n'
        return client.sendText(msg.from, replyMessage)
    }
    //const msgFirstWord = msg.type
}

function replyUndread() {
    client.getAllChatsWithMessages(true).then(
        async chats => {
            logger("getAllChatsWithMessages", chats.length)
            for (let c of chats) {
                if (Array.isArray(c.msgs)) {
                    const msgs = c.msgs as PartialMessage[]
                    const lastMsg: PartialMessage = msgs[msgs.length - 1]
                    await processMessage(lastMsg)
                }

            }
        }
    )
}
initWhatsapp('.data', options).then(
    page => isAuthenticated(page).then(
        async authed => {
            waPage = page
            STATE = authed ? 'logged_in' : 'need_login'
            if (!authed) {
                await isInsideChat()
                logger("Ok, got inside chat")
            }
            return injectApi(waPage).then(
                waPage => {
                    client = new Whatsapp(waPage)
                    setupListeners(client)
                    return replyUndread()
                }
            )
        }
    )
).then(
    () => logger('WhatsApp Server Siap')
)

const fields = {
    'nik': ['no ktp', 'no identitas', 'nomor ktp'],
    'nama': ['nama lengkap'],
    'asal_kedatangan': ['asal'],
    'tgl_kedatangan': [''],
    'alamat_di_datangi': ['alamat'],
    'nomor_hp': ['no', 'nomor'],
    'kejala': []
}

let conflictWaitTimers = null

function conflictWaiters() {
    client.useHere().then(
        v => {
            console.log('UseHere loop');
            conflictWaitTimers = setTimeout(conflictWaiters, 1000 * 30)
        }
    ).catch(err => {
        console.error(err)
        conflictWaitTimers = null
    })
}

function setupListeners(client: Whatsapp) {
    const conflicts = [
        SocketState.CONFLICT,
        SocketState.UNPAIRED,
        SocketState.UNLAUNCHED,
    ];
    client.onStateChange(
        state => {
            logger('State change', state);
            if (conflicts.includes(state)) {
                // wait and retry
                conflictWaitTimers = setTimeout(conflictWaiters, 1000 * 2)
                STATE = 'need_login'
            } else if (conflictWaitTimers) {
                STATE = 'logged_in'
                clearTimeout(conflictWaitTimers)
            }
        }
    )
    client.onMessage(message => processMessage(message));
}

function isInsideChat() {
    return waPage.waitForFunction(
        `document.getElementsByClassName('app')[0] &&
        document.getElementsByClassName('app')[0].attributes &&
        !!document.getElementsByClassName('app')[0].attributes.tabindex`,
        {
            timeout: 0,
        }).then(() => true)
        .catch(e => {
            logger("Error waiting.. retry..")
            return isInsideChat()
        })

}

export {
    STATE,
    waPage,
    client,
    MessageHandler,
    setupListeners,
    isInsideChat,
    wa_handlers,
    findHandler
}