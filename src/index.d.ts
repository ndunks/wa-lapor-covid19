// Declared in webpack.config.js
declare var WA: import("sulla").Whatsapp

declare namespace NodeJS {

    /** From `.env` config */
    interface ProcessEnv {
        DEBUG: string
        /** App listen host */
        LISTEN: string
        /** Listen port */
        PORT: string
        /** API Secret */
        SECRET: string
        /** WEB API URL */
        WEB_API_URL: string
        /** WEB API Key */
        WEB_API_KEY: string
    }
}