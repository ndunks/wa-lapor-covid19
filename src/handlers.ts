import { Router } from "./server/router";
import { STATE, waPage, client } from "./wa";
import web_api from "./web_api";

// Setup router
const router = new Router();
router.add({
    method: 'GET',
    path: '/',
    handler(req, res) {
        if (client) {
            return client.getConnectionState().then(
                client_state => ({
                    state: STATE,
                    client: client_state
                })
            )
        } else {
            return {
                state: STATE,
                client: null
            }
        }
    }
})

router.add({
    method: 'GET',
    path: '/login',
    handler(req, res) {
        if (STATE == 'starting') {
            return 'Still Starting App..'
        }
        if (STATE != 'need_login') {
            throw new ApiError("Already login", 406)
        }
        return waPage.evaluate(() => {
            const canvas = document.querySelector('canvas');
            return canvas ? canvas.toDataURL() : ''
        }).then(data => {
            const html = `<html><body><img src="${data}" /></body></html>`
            res.setHeader('Content-Type', 'text/html')
            res.setHeader('Content-Length', html.length)
            res.end(html)
        })
    }
})
router.add({
    method: 'GET',
    path: '/send',
    requireSecret: true,
    requireWhatsapp: true,
    async handler(req, res) {
        if (!req.params.no || !req.params.msg) {
            throw new ApiError("Tidak lengkap", 406)
        }
        let no = `${req.params.no.replace(/\D/g, '').replace(/^0/, '62')}@c.us`
        let msg = req.params.msg.trim();
        if (msg.indexOf('%nama%')) {
            let nama = '';
            try {
                nama = await client.getContact(no).then(
                    v => v && v.pushname || ''
                )
            } catch (e) { }
            msg = msg.replace(/%nama%/g, nama);
        }
        logger('Send WA', no, msg)
        return client.sendText(no, msg).then(
            v => v != 'false'
        )
    }
})

router.add({
    method: 'GET',
    path: '/env',
    requireSecret: true,
    handler: () => process.env
})

router.add({
    method: 'GET',
    path: '/profile',
    requireSecret: true,
    requireWhatsapp: true,
    async handler(req, res) {
        const result: any = {}
        if (Object.keys(req.params).length > 1) {
            if (req.params.status) {
                await client.setProfileStatus(req.params.status)
                result.statusUpdate = true
            }
            if (req.params.name) {
                await client.setProfileName(req.params.name)
                result.nameUpdate = true
            }
            return result
        } else {
            return client.getHostDevice().then(
                r => ({
                    phone: r.phone,
                    name: r.pushname,
                    battery: r.battery,
                    charging: r.plugged
                })
            )
        }

    }
})
router.add({
    method: 'GET',
    path: '/web_api',
    handler: () => web_api.status()
})
export default router