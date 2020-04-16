import { ServerResponse, STATUS_CODES } from "http";

export default class Response extends ServerResponse {

    /**
     * Send and END!
     * @param data any
     */
    send(data: any) {
        if (typeof (data) != 'object') {
            this.setHeader('Content-Type', 'text/plain');
            super.end(data.toString());
        } else {
            this.setHeader('Content-Type', 'application/json');
            super.end(JSON.stringify(data, null, process.env.DEBUG ? 2 : undefined));
        }
    }

    /**
     * Error Object or HTTP Code number
     * @param code HTTP Status Code, or Error Object
     * @param message Message string or object. False for no content
     */
    code(code: number, message?: object | string | boolean) {
        this.statusCode = code;
        if ((typeof (message) == 'boolean' && !message)
            || typeof message == 'undefined') {
            return this.end();
        }
        this.send(typeof (message) == 'object' ? message : {
            code,
            message: message || STATUS_CODES[code]
        })
    }
}
