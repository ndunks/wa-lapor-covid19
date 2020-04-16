
process.env.DEBUG = process.env.DEBUG || ((process.argv.findIndex(v => v == '--debug') >= 0) ? '1' : null);

import { config as dotenv } from "dotenv";
import './utils/logger';
import './utils/api-error';
import router from "./handlers";
import { listen } from "./server";

if (!dotenv().parsed && !dotenv({ path: '../.env' }).parsed) {
    // Default config
    Object.assign(process.env, {
        PORT: 1555,
        LISTEN: '0.0.0.0',
        SECRET: 'KlpWaServer'
    })
}

logger('Starting server', `${process.env.LISTEN}:${process.env.PORT}`, process.env.SECRET);
listen(process.env.LISTEN, parseInt(process.env.PORT), router);
