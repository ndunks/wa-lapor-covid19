
import { join } from "path";
import * as fs from "fs"
import { config as dotenv } from "dotenv";
process.env.DEBUG = process.env.DEBUG || ((process.argv.findIndex(v => v == '--debug') >= 0) ? '1' : null);
import './utils/logger';
import './utils/api-error';

// Default config
Object.assign(process.env, {
    PORT: 1555,
    LISTEN: '0.0.0.0',
    SECRET: 'KlpWaServer',
    DB: join(process.cwd(), '.db')
})
logger('.env', dotenv().parsed || dotenv({ path: '../.env' }).parsed);

import router from "./handlers";
import { listen } from "./server";
import { db_init, dbs } from "./db";
import { waPage } from "./wa";

fs.writeFileSync(".pid", process.pid)


db_init(router).then(
    () => {
        logger('Starting server', `${process.env.LISTEN}:${process.env.PORT}`, process.env.SECRET);
        listen(process.env.LISTEN, parseInt(process.env.PORT), router);
    }
)
process.on('SIGTERM', async () => {
    logger('Closing due SIGTERM')
    if (waPage) {
        try {
            await waPage.close()
        } catch (error) { }
    }
    process.exit(0)
});