declare global {
    var logger: typeof console.log;
}

(<any>global).logger = process.env.DEBUG ? console.log : () => {};

export {}
