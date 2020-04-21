import { MessageHandler, wa_handlers, findHandler } from "../wa";

function formatHelp(h: MessageHandler) {
    let txt = `${h.info}_\n`
    if (h.format) {
        txt += `Format:\n${h.format}\n`
    }
    return txt
}

const help_handler: MessageHandler = {
    name: 'help',
    matcher: /^help/i,
    info: `Menampilkan bantuan dalam menggunakan sistem`,
    reply: (msg, client) => {
        let msgs = msg.body.split(/\s+/);
        let replyMessage = '';
        if (msgs.length > 1) {
            let handler = findHandler(msgs[1]);
            if (handler) {
                replyMessage += `Perintah *${handler.name}*\n${handler.info}`;
                if (handler.format) {
                    return client.sendText(msg.from, `${replyMessage}\n*Format*:\n`)
                        .then(() => client.sendText(msg.from, handler.format))
                } else {
                    return client.sendText(msg.from, replyMessage)
                }
            } else {
                replyMessage += `Perintah "${msgs[1]} tidak dikenal\n`
            }
        }

        replyMessage += '--*Daftar Perintah*--\n\n'
        wa_handlers.filter(h => !h.hidden).forEach(
            h => {
                replyMessage += `*${h.name}*\n`
                replyMessage += formatHelp(h)
            }
        )
        return client.sendText(msg.from, replyMessage)

    }
}
export default help_handler

