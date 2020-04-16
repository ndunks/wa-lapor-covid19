import * as http from "http";
import { Router } from "./router";
import Response from "./response";
import Request from "./request";


let router: Router = null

function handleError(error: any, res: Response) {
    if (res.finished || res.headersSent) {
        return logger('Got error but response finished');
    }
    if (typeof (error) == "number" && http.STATUS_CODES[error]) {
        return res.code(error);
    }

    if (error instanceof ApiError) {
        res.statusCode = error.code;
    } else {
        res.statusCode = 500;
    }
    if (logger && error instanceof Error) {
        const send = Object.create(null);
        Object.getOwnPropertyNames(error).forEach(f => send[f] = error[f]);
        res.send(send)
    } else {
        res.end()
    }
}

async function requestListener(req: Request, res: Response) {

    /* if ('string' == typeof req.headers.origin) {
        const [scheme, domain] = req.headers.origin.split("//", 2);
        if ((domain || "").endsWith(process.env.DOMAIN)) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }
    // CORS Handle
    if (req.method == 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE');
        if (req.headers['access-control-request-headers']) {
            res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
        }
        res.setHeader('Access-Control-Max-Age', 60 * 60 * 60 * 30);
        return res.code(204, false); // no content
    } */
    //res.setHeader('Access-Control-Allow-Origin', '*');

    // Roter handler
    const handlerModule = router.find(req);
    logger('Req', req.method, req.url);
    if (!handlerModule) {
        return res.code(404);
    }
    if (handlerModule.requireSecret) {
        if (!req.params.p || req.params.p != process.env.SECRET) {
            logger('Invalid Secret:', req.params.p)
            return res.code(403);
        }
    }

    let data;
    try {
        data = handlerModule.handler(req, res, handlerModule);
        if (data instanceof Promise) {
            data = await data;
        }
    } catch (error) {
        return handleError(error, res);
    }

    if (res.finished || res.headersSent) {
        logger("Response content handled by handler");
    } else {
        // serve the content
        if (data == null || typeof (data) == 'undefined') {
            res.code(204);
        } else {
            res.send(data);
        }
    }
}


function listen(host: string, port?: number, routerSource?: Router): http.Server {
    router = routerSource
    return http.createServer({
        IncomingMessage: Request,
        ServerResponse: Response,

    }, requestListener).listen(port);
}

export { listen, Response, Request, requestListener }
