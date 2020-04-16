import { IncomingMessage } from "http";
import { HTTP_METHOD } from "./router";

const LIMIT_REQUEST_JSON = 1024 * 1024 * 1; // 1 MB

/**
 * Called firstime on every conection
 */
export default class Request<T extends any = object> extends IncomingMessage {
    method: HTTP_METHOD
    params: { [name: string]: string } = Object.create(null);
    body: T;
    bodyRaw: Buffer
    bodySize = 0;
    path: string;
    
    /** Get client real IP Address */
    ip() {
        const ip: any = {
            remote: this.connection.remoteAddress
        }
        if ('undefined' !== typeof this.headers['x-forwarded-for']) {
            ip.forwards = Array.isArray(this.headers['x-forwarded-for']) ?
                this.headers['x-forwarded-for'] :
                [this.headers['x-forwarded-for']]
        }
        return ip
    }
    /**
     * Read request body and parse as JSON
     */
    json<T = any>(): Promise<T> {
        const size = parseInt(this.headers['content-length']);
        if (!size) {
            return Promise.resolve(Object.create(null));
        }
        if (!this.headers['content-type']
            || this.headers['content-type'].indexOf('application/json') !== 0) {
            throw new ApiError('Content is not JSON', 400);
        }
        return new Promise((resolve, reject) => {
            const buffers: Buffer[] = [];
            const errListener = (err) => {
                this.destroy();
                reject(err);
            };
            const dataListner = (data: Buffer) => {
                if ((this.bodySize += data.length) > LIMIT_REQUEST_JSON) {
                    return reject({ code: 413 });
                } else {
                    buffers.push(data);
                }
            }
            const endListener = () => {
                this.removeListener('data', dataListner)
                    .removeListener('error', errListener)
                    .removeListener('end', endListener);
                try {
                    this.bodyRaw = Buffer.concat(buffers)
                    resolve(JSON.parse(this.bodyRaw.toString()))
                } catch (err) {
                    err.code = 400;
                    reject(err);
                }
            }
            this.on('error', errListener)
                .on('data', dataListner)
                .on('end', endListener);
        })
    }

}