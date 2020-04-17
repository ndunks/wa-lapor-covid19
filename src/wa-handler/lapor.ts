import { MessageHandler } from "../wa";
import { dbs } from "../db";
const lapor_handler: MessageHandler = {
    name: 'lapor',
    matcher: /^lapor/i,
    info: 'Melaporkan pendatang baru, yang anda ketahui',
    format: `lapor\nNIK:\nNama: \nTgl Kedatangan: \nAsal: \nAlamat Kedatangan: \n` +
        ``,
    reply(msg, client) {
        const lines = msg.body.split(/[\r\n]+/);
        // first line is lapor
        lines.shift()
        const data: { [key: string]: string } = {};
        let lastKey = null;
        let keyLength = 0
        lines.forEach(
            line => {
                line = line.trim()
                if (line.indexOf(':') < 0) {
                    if (lastKey) {
                        data[lastKey] += "\n" + line
                    }
                } else {
                    keyLength++
                    let [key, value] = line.split(/\s+:\s+/, 2)
                    key = key.toLowerCase()
                    data[key] = value
                    lastKey = key
                }
            }
        )

        if (keyLength == 0) {
            return client.sendText(msg.from, 'Mohon maaf, *data kurang lengkap*')
        }

        if (!data.nama) {
            return client.sendText(msg.from, '*Harap sertakan nama*')
        }

        if (data.nik) {
            data._id = data.nik
            //return client.sendText(msg.from,`Harap sertakan NIK, jika tidak tahu,tulis NIK:0`)
        }
        return new Promise(
            (r, e) => dbs.person.insert(data, (err, doc) => {
                if (err) {
                    logger('Insert err', err)
                    client.sendText(msg.from, 'Terjadi kesalahan: ' + err.message)
                        .then(r)
                } else {
                    client.sendText(msg.from, `Terimakasih ${msg.self}, laporan anda akan ditindak lanjuti.`)
                        .then(r)
                }
            }))

    }
}

export default lapor_handler