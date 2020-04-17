import { MessageHandler } from "../wa";
import { dbs } from "../db";
const status_handler: MessageHandler = {
    name: 'status',
    matcher: /^status/i,
    info: `Menampilkan status di covid di desa`,
    format: 'status',
    reply(msg, client) {
        return new Promise(
            (res, rej) => {
                dbs.person.count({}, function (err, count) {
                    if (err)
                        return rej(`Mohon maaf, gagal mengambil data.`)
                    client.sendText(msg.from, `Total ${count}`).finally(res)
                })
            })
    }
}
export default status_handler