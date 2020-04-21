import { MessageHandler } from "../wa";
import { dbs } from "../db";
interface LaporData {
    nama: string,
    nik?: string,
    umur?: string,
    rt?: string,
    rw?: string,
    dusun?: string,
    asal_kota?: string,
    tgl_kepulangan?: string,
    keluhan?: string,
    no_hp?: string,
    wa_sent?: string,
    pelapor?: string,
    keterangan?: string
}
const aliases = {
    asal_kota: ['asal', 'asal_kedatangan', 'kota'],
    no_hp: ['no', 'tel', 'tlp', 'no_wa', 'no_telp', 'telepon', 'nomor hp',
        'nomor telepon', 'kontak'],
    nik: ['no_ktp', 'nomor_ktp', 'kitas', 'no_kitas', 'ktp', 'nomor_identitas'],
    nama: ['nama_lengkap'],
    keluhan: ['kondisi', 'gejala', 'kesehatan', 'masalah'],
    tgl_kepulangan: ['tgl_pulang', 'tanggal_pulang', 'tanggal_kembali', 'tgl_datang',
        'waktu_kedatangan', 'kedatangan'],
    keterangan: ['ket', 'ket_tambahan', 'tambahan']
}
const lapor_handler: MessageHandler = {
    name: 'lapor',
    matcher: /^lapo+r/i,
    info: 'Melaporkan pendatang baru, yang anda ketahui. ketik ```help lapor``` untuk bantuan',
    format: `LAPOR
NIK:
Nama:
No Hp:
Asal Kota:
Tgl Kedatangan:
RT/RW Kedatangan:
Keluhan:
Keterangan:`,
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