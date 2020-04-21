import { MessageHandler } from "../wa";
import web_api from "../web_api";
import { AxiosError } from "axios";
let pesan_laporan_balasan = `Terimakasih %nama% telah membantu tim satgas desa Klampok ` +
    `dalam menangani pandemik Covid-19. Laporan sudah kami terima dan tercatat pada data kami.`
let pesan_himbauan = `Selamat siang...Sdr. %nama% kami menghimbau selama pulang berada dirumah agar anda mengisolasi diri dirumah , tidak pergi atau berkumpul dikeramaian, menjaga kebersihan diri dengan pembiasaan hidup bersih dan sehat, apabila terdapat keluhan batuk,demam, atau sesak nafas segera periksa ke puskesmas terdekat.. Mohon untuk menjadi perhatian.
Salam Sehat
#SATGAS COVID 19 DESA KLAMPOK
http://klampok.id`

type LaporData = { [key: string]: string } & {
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
    keterangan?: string,
    raw: string,
    //must be manually parsed
    rt_rw?: string,
}
const reverse_aliases = Object.create(null);
const aliases: { [key: string]: string[] } = {
    asal_kota: ['asal', 'asal_kedatangan', 'kota'],
    no_hp: ['no', 'tel', 'tlp', 'no_wa', 'no_telp', 'telepon', 'nomor hp',
        'nomor telepon', 'kontak'],
    nik: ['no_ktp', 'nomor_ktp', 'kitas', 'no_kitas', 'ktp', 'nomor_identitas'],
    nama: ['nama_lengkap'],
    keluhan: ['kondisi', 'gejala', 'kesehatan', 'masalah'],
    tgl_kepulangan: ['tgl_pulang', 'tanggal_pulang', 'tanggal_kembali', 'tgl_datang',
        'waktu_kedatangan', 'kedatangan'],
    keterangan: ['ket', 'ket_tambahan', 'tambahan'],
    rt_rw: ['rt_rw_kedatangan', 'rtrw_kedatangan']
}
Object.keys(aliases).forEach(
    f => aliases[f].forEach(
        a => reverse_aliases[a] = f
    )
)
const rtrw_matcher = [
    /(\d+)\/(\d+)/, // 03/11
    /rt\s+(\d+)\s+(\d+)/i, // rt 03/11
    /rt\s*(\d+)\s*rw\s*(\d+)/i // rt 03 rw 11
]
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
Keterangan: `,
    async reply(msg, client) {
        const lines = msg.body.split(/[\r\n]+/);
        // first line is lapor
        lines.shift()
        const data: LaporData = {} as any;
        let lastKey = null;
        logger('LAPOR FROM', msg.from)
        lines.forEach(
            line => {
                line = line.trim()
                if (line.indexOf(':') < 0) {
                    if (lastKey) {
                        data[lastKey] += "\n" + line
                    }
                } else {
                    let [key, value] = line.split(/\s*:\s*/, 2)
                    key = key.trim().toLowerCase().replace(/[\\/\-\s]+/g, '_')
                    if (typeof data[key] == 'undefined') {
                        data[key] = ''
                    }
                    data[key] += (value || '').trim()
                    lastKey = key
                }
            }
        )
        const keys = Object.keys(data);
        keys.forEach(k => {
            //clean
            data[k] = data[k].trim()
            //aliases
            if (reverse_aliases[k]) {
                data[reverse_aliases[k]] = data[k]
                delete data[k]
            }
        })

        if (keys.length == 0) {
            return client.sendText(msg.from, 'Mohon maaf, *data kurang lengkap*')
        }

        if (!data.nama) {
            return client.sendText(msg.from, '*Harap sertakan nama*')
        }

        if (data.rt_rw) {
            let tmpa: string[];
            if (data.rt_rw.match(/^[\/\s\d]+$/g)) {
                tmpa = data.rt_rw.split(/[\s\/]+/, 2)
                data.rt = tmpa[0]
                data.rw = tmpa[1]
            } else {

                for (let rs of rtrw_matcher) {
                    if ((tmpa = data.rt_rw.match(rs))) {
                        data.rt = tmpa[0]
                        data.rw = tmpa[1]
                        break;
                    }
                }
                if (!data.rt) {
                    logger('RT RW tidak sesuai format:', data.rt_rw)
                }
            }
        }
        data.raw = msg.body
        data.pelapor = msg.from
        if (data.no_hp) {
            let nohp = data.no_hp.replace(/\D+/g, '').replace(/^0/, '62')
            if (nohp.length < 11 || nohp.length > 14) {
                logger('No hp invalid:', nohp)
            } else {
                data.no_hp = nohp;
                logger('Sending himbauan to', nohp)
                if (await client.sendText(`${nohp}@c.us`, pesan_himbauan.replace('%nama%', data.nama))) {
                    data.wa_sent = 'true'
                }
            }
        }
        let nama_pelapor = await client.getContact(msg.from).then(
            v => v && v.pushname
        )
        logger('SEND WEB API', data)
        await web_api.lapor(data).then(
            (res) => {
                logger('Api response', res)
                return client.sendText(
                    msg.from,
                    pesan_laporan_balasan.replace('%nama%', nama_pelapor)
                )
            }
        ).catch(
            (e: AxiosError) => {
                if (e.isAxiosError) {
                    logger('ERRR', e.request)
                    return client.sendText(msg.from, `Maaf, terjadi kesalahan\n${e.response.data}`)
                } else {
                    return client.sendText(msg.from, `Maaf, terjadi kesalahan`)
                }
            }
        )
    }
}

export default lapor_handler