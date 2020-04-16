import { Router } from "./server/router";
import { STATE, waPage, client } from "./wa";

// Setup router
const router = new Router();
router.add({
    method: 'GET',
    path: '/',
    handler(req, res) {
        if( client ){
            return client.getConnectionState().then(
                client_state => ({
                    state: STATE,
                    client: client_state
                })
            )
        }else{
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
    handler(req, res){
        req.params
    }
})
export default router