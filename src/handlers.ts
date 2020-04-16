import { Router } from "./server/router";
import { STATE, waPage, client } from "./wa";

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
    handler(req, res) {
        if (!req.params.no || !req.params.msg) {
            throw new ApiError("Tidak lengkap", 406)
        }
        let no = `${req.params.no}@c.us`
        return client.sendText(no, req.params.msg).then(
            v => v != 'false'
        )
    }
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
export default router