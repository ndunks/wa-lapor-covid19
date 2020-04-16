import { Page } from "puppeteer";
import { Whatsapp, SocketState } from "sulla";
import { CreateConfig } from "sulla/dist/config/create-config";
import { initWhatsapp, injectApi } from "sulla/dist/controllers/browser";
import { isAuthenticated, retrieveQR } from "sulla/dist/controllers/auth";

export let STATE: 'starting' | 'need_login' | 'logged_in' | SocketState = 'starting'
export let waPage: Page = null
export let client: Whatsapp = null

const options: CreateConfig = {
    headless: true,
    devtools: false,
    useChrome: false,
    debug: false,
    logQR: false,
    browserArgs: ['--no-sandbox'],
    refreshQR: 30000,
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
                }
            )
        }
    )
)
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

export function setupListeners(client: Whatsapp) {
    client.onStateChange(
        state => {
            logger('State change', state);
            if (state == SocketState.CONFLICT) {
                // wait and retry
                conflictWaitTimers = setTimeout(conflictWaiters, 1000 * 20)
            } else if (conflictWaitTimers) {
                clearTimeout(conflictWaitTimers)
            }
        }
    )
    client.onMessage((message) => {
        client.sendText(message.from, '👋' + message.body);
    });
}

export function isInsideChat() {
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

