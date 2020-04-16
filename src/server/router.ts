
import { Request, Response } from ".";

export type HTTP_METHOD = 'PUT' | 'POST' | 'GET' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface HandlerExports {
    handler: HandlerModule | HandlerModule[]
}

export interface HandlerModule/*  extends OpenAPIV3.OperationObject  */ {
    method: HTTP_METHOD
    path: string
    handler: HandlerFunction
    requireSecret?: boolean
}

export type HandlerFunction = (
    req: Request,
    res: Response,
    config: HandlerModule
) => any | Promise<any>;

/*
 * Ported to Typescript from from https://github.com/trekjs/router
 * Copyright(c) 2015-2017 Fangdun Cai
 * MIT Licensed
 */

enum Kind {
    SKIND = 0,
    PKIND = 1,
    AKIND = 2,
    STAR = 42,
    SLASH = 47,
    COLON = 58
}

export class PathNode {
    constructor(
        public prefix = '/',
        public children: PathNode[] = [],
        public kind: Kind = Kind.SKIND,
        public map: { [method in HTTP_METHOD]?: { handler: HandlerModule, pnames: string[] } } = Object.create(null),
        public label = prefix.charCodeAt(0)
    ) { }

    addChild(n: PathNode) {
        this.children.push(n)
    }

    findChild(label: number, kind: Kind, l?: number, e?: PathNode, i = 0) {
        for (l = this.children.length; i < l; i++) {
            e = this.children[i]
            if (label === e.label && kind === e.kind) {
                return e
            }
        }
    }

    findChildWithLabel(label: number, l?, e?, i = 0) {
        for (l = this.children.length; i < l; i++) {
            e = this.children[i]
            if (label === e.label) {
                return e
            }
        }
    }

    findChildByKind(kind: Kind, l?, e?, i = 0) {
        for (l = this.children.length; i < l; i++) {
            e = this.children[i]
            if (kind === e.kind) {
                return e
            }
        }
    }

    addHandler(method: HTTP_METHOD, handler: HandlerModule, pnames: string[]) {
        this.map[method] = { handler, pnames }
    }

    findHandler(method: HTTP_METHOD) {
        return this.map[method]
    }
}

export class Router {
    tree: PathNode
    constructor() {
        this.tree = new PathNode()
    }

    add(handler: HandlerModule) {

        let path = handler.path;
        let [i, l, pnames, ch, j] = [0, path.length, [], undefined as number, undefined as number]

        for (; i < l; ++i) {
            ch = path.charCodeAt(i)
            if (ch === Kind.COLON) {
                j = i + 1

                this.insert(handler.method, path.substring(0, i), Kind.SKIND)
                while (i < l && path.charCodeAt(i) !== Kind.SLASH) {
                    i++
                }

                pnames.push(path.substring(j, i))
                path = path.substring(0, j) + path.substring(i)
                i = j
                l = path.length

                if (i === l) {
                    this.insert(handler.method, path.substring(0, i), Kind.PKIND, pnames, handler)
                    return
                }
                this.insert(handler.method, path.substring(0, i), Kind.PKIND, pnames)
            } else if (ch === Kind.STAR) {
                this.insert(handler.method, path.substring(0, i), Kind.SKIND)
                pnames.push('*')
                this.insert(handler.method, path.substring(0, l), Kind.AKIND, pnames, handler)
                return
            }
        }
        this.insert(handler.method, path, Kind.SKIND, pnames, handler)
    }

    insert(method, path, t, pnames?: string[], handler?: HandlerModule) {
        // Current node as root
        let cn = this.tree,
            prefix: string,
            sl: number,
            pl: number,
            l: number,
            max: number,
            n: PathNode,
            c: PathNode;

        while (true) {
            prefix = cn.prefix
            sl = path.length
            pl = prefix.length
            l = 0

            // LCP
            max = sl < pl ? sl : pl
            while (l < max && path.charCodeAt(l) === prefix.charCodeAt(l)) {
                l++
            }

            if (l < pl) {
                // Split node
                n = new PathNode(prefix.substring(l), cn.children, cn.kind, cn.map)
                cn.children = [n] // Add to parent

                // Reset parent node
                cn.label = prefix.charCodeAt(0)
                cn.prefix = prefix.substring(0, l)
                cn.map = Object.create(null)
                cn.kind = Kind.SKIND

                if (l === sl) {
                    // At parent node
                    cn.addHandler(method, handler, pnames)
                    cn.kind = t
                } else {
                    // Create child node
                    n = new PathNode(path.substring(l), [], t)
                    n.addHandler(method, handler, pnames)
                    cn.addChild(n)
                }
            } else if (l < sl) {
                path = path.substring(l)
                c = cn.findChildWithLabel(path.charCodeAt(0))
                if (c !== undefined) {
                    // Go deeper
                    cn = c
                    continue
                }
                // Create child node
                n = new PathNode(path, [], t)
                n.addHandler(method, handler, pnames)
                cn.addChild(n)
            } else if (handler !== undefined) {
                // Node already exists
                cn.addHandler(method, handler, pnames)
            }
            return
        }
    }

    find(req: Request, path?: string, currentNode?: PathNode, paramIndex = 0, params = []): HandlerModule | void {
        currentNode = currentNode || this.tree; // Current node as root
        path = path === undefined ? req.url.replace(/\/+$/, '') : path;
        const pathLength = path.length;
        const prefix = currentNode.prefix;
        let i, tmpLength = 0, max, c, preSearch, result;

        // Search order static > param > match-any
        if (pathLength === 0 || path === prefix) {
            // Found
            result = currentNode.findHandler(req.method);
            if ((result && result.handler) !== undefined) {
                if (result.pnames !== undefined) {
                    for (i = 0, tmpLength = result.pnames.length; i < tmpLength; ++i) {
                        req.params[result.pnames[i]] = params[i];
                    }
                }
                return result.handler;
            }
            return;
        }

        const prefixLength = prefix.length;
        // LCP
        max = pathLength < prefixLength ? pathLength : prefixLength
        while (tmpLength < max && path.charCodeAt(tmpLength) === prefix.charCodeAt(tmpLength)) {
            tmpLength++
        }

        if (tmpLength === prefixLength) {
            path = path.substring(tmpLength)
        }

        preSearch = path
        // Static node
        c = currentNode.findChild(path.charCodeAt(0), Kind.SKIND)
        if (c !== undefined) {
            result = this.find(req, path, c, paramIndex, params)
            if (result !== undefined) {
                return result;
            }
            path = preSearch
        }

        // Not found node
        if (tmpLength !== prefixLength) {
            return;
        }
        // Param node (:)
        c = currentNode.findChildByKind(Kind.PKIND)
        if (c !== undefined) {
            tmpLength = path.length
            i = 0
            while (i < tmpLength && path.charCodeAt(i) !== Kind.SLASH) {
                i++
            }

            params[paramIndex] = path.substring(0, i)

            paramIndex++
            preSearch = path
            path = path.substring(i)

            result = this.find(req, path, c, paramIndex, params);
            if (result !== undefined) {
                return result
            }

            paramIndex--
            params.pop()
            path = preSearch
        }

        // Any node (*)
        c = currentNode.findChildByKind(Kind.AKIND)
        if (c !== undefined) {
            params[paramIndex] = path
            return this.find(req, '', c, paramIndex, params);
        }
    }
}
