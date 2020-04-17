import Datastore from "nedb";
import { resolve, join } from "path";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { Router } from "./server/router";
import { Request } from "./server";
export const dbs: { [name: string]: Datastore } = Object.create(null);

function requestFindHandler(this: Datastore, req: Request, res: Response) {
    return new Promise(async (resolve, reject) => {
        //remove password/secret
        delete req.params.p
        this.find(req.params, (err, docs) => {
            resolve(docs);
        })
    });
}

export function db_init(router: Router) {
    if (!existsSync(process.env.DB)) {
        logger('DB Mkdir', process.env.DB)
        mkdirSync(process.env.DB)
    }

    return Promise.all(
        [
            () => {
                const name = 'person'
                const filename = join(process.env.DB, `${name}.db`);
                return new Promise((resolve, reject) => {
                    const db = new Datastore({
                        filename,
                        autoload: true,
                        onload: resolve
                    });
                    dbs[name] = db;
                    // add to router
                    router.add({
                        method: 'GET',
                        path: `/${name}`,
                        handler: requestFindHandler.bind(db)
                    })
                })
            }
        ]
    )
}