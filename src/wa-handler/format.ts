import { MessageHandler, wa_handlers } from "../wa";
const format_handler: MessageHandler = {
    name: 'format',
    matcher: /^format/i,
    info: 'Infomasi tentang format perintah tertentu, _Contoh_:format lapor',
    format: `format _(nama perintah)_`,
    async reply(msg, client) {
        const cmd = msg.body.split(/\s+/, 2);
        if (cmd.length != 2) {
            return client.sendText(msg.from, `Format salah, contoh:\n\`\`\`format lapor\`\`\``)
        }
        const found = wa_handlers.find(v => v.name == cmd[1].toLowerCase())
        if (found) {

            let replies = [`*Format ${found.name}*, silahkan copas pesan berikut:`, found.format]
            if (found.contoh) {
                replies.push('*Contoh*:')
                replies.push(found.contoh)
            }
            while (replies.length) {
                await client.sendText(msg.from, replies.shift())
            }
        } else {
            return client.sendText(msg.from, `Mohon maaf, format tsbt tidak dikenali`)
        }
    }
}

export default format_handler