import { MessageHandler } from "../wa";
import { dbs } from "../db";
import web_api from "../web_api";
const status_handler: MessageHandler = {
    name: 'status',
    matcher: /^status/i,
    info: `Menampilkan status jumlah pendatang di desa Klampok`,
    reply: (msg, client) => web_api.status().then(
        (status: { last_update: string, summary: { [dusun: string]: number } }) => {
            let reply = Object.keys(status.summary).map(
                v => `${v}\t*${status.summary[v]} Orang*`
            ).join("\n");
            reply += `\n_Laporan Terakhir: ${status.last_update}_`
            client.sendText(msg.from, reply);
        }
    )
}
export default status_handler