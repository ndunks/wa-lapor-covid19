import { MessageHandler, wa_handlers, findHandler } from "../wa";

function formatHelp(h: MessageHandler) {
    let txt = `${h.info}\n`
    return txt
}

const help_handler: MessageHandler = {
    name: 'help',
    matcher: /^help/i,
    info: `Menampilkan bantuan dalam menggunakan sistem`,
    contoh: 'help lapor',
    reply: (msg, client) => {
        let msgs = msg.body.split(/\s+/);
        let replyMessage = '';
        if (msgs.length > 1) {
            let handler = findHandler(msgs[1]);
            if (handler) {
                replyMessage += `Perintah *${handler.name}*\n${handler.info}`;
                if (handler.format) {
                    return client.sendText(msg.from, replyMessage)
                        .then(async () => {
                            if (handler.contoh) {
                                await client.sendText(msg.from, `*Contoh:*\n\`\`\`${handler.contoh}\`\`\``)
                            }
                            await client.sendText(msg.from, 'Silahkan di copy-paste, diisi, lalu kirim balik format berikut:')
                            return client.sendText(msg.from, handler.format)
                        })
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
                replyMessage += `*${h.name}*\n${h.info}\n`
                if (h.contoh) {
                    replyMessage += `Contoh:\`\`\`${h.contoh}\`\`\`\n`
                }
            }
        )
        return client.sendText(msg.from, replyMessage)

    }
}
export default help_handler

