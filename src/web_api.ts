import Axios, { AxiosInstance, Method } from "axios";

class WebApi {
    http: AxiosInstance
    private defaultParams: any
    private caches = Object.create(null)

    constructor(baseUrl: string, key: string) {
        if (baseUrl) {
            this.http = Axios.create({
                baseURL: baseUrl.replace(/\/+$/, '') + '/wp-admin/admin-ajax.php'
            })
        } else {
            logger("No Web API defined", baseUrl, key)
        }

        this.defaultParams = {
            action: 'info_pendatang',
            key
        }
    }
    req(params, method?: Method, data?: any) {
        if (!this.http) {
            throw new ApiError('Web Api not configured', 500);
        }

        return this.http.request({
            params: Object.assign(Object.create(null), this.defaultParams, params)
            , method, data
        }).then(
            res => res.data
        )
    }
    do(do_action: string) {
        return this.req({ do: do_action })
    }

    status() {
        return this.do('status')
    }
}
const web_api = new WebApi(process.env.WEB_API_URL, process.env.WEB_API_KEY);
export default web_api;
export { WebApi }
