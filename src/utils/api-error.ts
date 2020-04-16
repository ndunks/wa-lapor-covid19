
class ApiErrorConstructor extends Error {
    constructor(message: string, public code: number) {
        super(message)
    }
}
declare global {
    var ApiError: typeof ApiErrorConstructor;
}

(<any>global).ApiError = ApiErrorConstructor;

export {}
