(function (exporter){
    class Session {
        constructor(login, password){
            this.token = null;
            this.password = password;
            this.login = login;
        }
    
        setToken(token){
            if(typeof token === "string")
                this.token = token;
            else
                throw new TypeError("The token data must be string.");
        }
    }

    class CharactersApi {
        constructor(api){
            this.api = api;
        }

        remove (ident, progress) { return this.api.call('characters.rem', {ident}, progress) }

        get (filter, progress) { return this.api.call('characters.get', {filter}, progress) }

        edit (ident, data, progress) { return this.api.call('characters.edt', {ident, data}, progress) }
    }

    class UsersApi {
        constructor(api){
            this.api = api;
        }

        remove (ident, progress) { return this.api.call('users.rem', {ident}, progress) }

        get (filter, progress) { return this.api.call('users.get', {filter}, progress) }

        edit (ident, data, progress) { return this.api.call('users.edt', {ident, data}, progress) }
    }

    class BusinessesApi {
        constructor(api){
            this.api = api;
        }

        add (data, progress) { return this.api.call('businesses.add', {data}, progress) }

        remove (ident, progress) { return this.api.call('businesses.rem', {ident}, progress) }

        get (filter, progress) { return this.api.call('businesses.get', {filter}, progress) }

        edit (ident, data, progress) { return this.api.call('businesses.edt', {ident, data}, progress) }
    }

    class DistrictsMapApi {
        constructor(api){
            this.api = api;
        }

        get (progress) { return this.api.call("map.get.districts", {}, progress) }
    
        set (districts, progress) { return this.api.callProgress("map.set.districts", {districts}, progress) }
    }

    class ProvincesMapApi {
        constructor(api){
            this.api = api;
        }

        get (owner, progress) { return this.api.call("map.get.provinces", {owner}, progress) }
    
        set (provinces, owner, progress) { return this.api.callProgress("map.set.provinces", {provinces, owner}, progress) }
    }
    
    class MapApi {
        constructor(api){
            this.api = api;

            this.districts = new DistrictsMapApi(api);
            this.provinces = new ProvincesMapApi(api);
        }
    
        get (id, progress) { return this.api.call("map.get", {id}, progress) }
    
        set (map, progress) { return this.api.callProgress("map.set", {map}, progress) }
    }

    class ItemTypesApi {
        constructor(api){
            this.api = api;
        }

        add (data, progress) { return this.api.call('items.types.add', {data}, progress) }

        remove (ident, progress) { return this.api.call('items.types.rem', {ident}, progress) }

        edit (ident, data, progress) { return this.api.call('items.types.edt', {ident, data}, progress) }
    }
    
    class ItemApi {
        constructor(api){
            this.api = api;

            this.types = new ItemTypesApi(api);
        }
    
        set (data, progress) { return this.api.call('items.set', {data}, progress) }
    
        get (filter, progress) { return this.api.call('items.get', {filter}, progress) }
    
        remove (named_id, progress) { return this.api.call('items.rem', {named_id}, progress) }

        edit (named_id, data, progress) { return this.api.call('items.edt', {named_id, data}, progress) }
    }
    
    
    exporter.api = new class BeyondAdminAPI {
        constructor(){
            this.version = `v1.0`;
            this.session = null;
    
            this.map = new MapApi(this);
            this.item = new ItemApi(this);
            this.businesses = new BusinessesApi(this);
            this.users = new UsersApi(this);
            this.characters = new CharactersApi(this);
        }
    
        async callProgress(func, data = {}, progress) {
            const run_w_progress = typeof progress === 'function';

            if(this.session)
                if(this.session.token)
                    data.token = this.session.token;
                else {
                    data.login = this.session.login;
                    data.password = this.session.password;
                }
            
            if(!run_w_progress)
                console.warn('Running request without progress function.')

            try {
                data = await fetch(`api/${this.version}/`, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: "POST",
                    body: JSON.stringify({
                        function: func,
                        ...data
                    })
                })

                const decoder = new TextDecoder("utf-8");
        
                data = data.body.getReader();
    
                while(1){
                    let {done, value} = await data.read(),
                         buffer = decoder.decode(value), cur;
    
                    if((cur = (buffer.match(/}/g) || [])).length === 1){
                        buffer = JSON.parse(decoder.decode(value));
    
                        if(buffer.status === "ok")
                            return buffer;
                        else if (buffer.status === "error")
                            throw buffer;
                        else if(run_w_progress)
                            progress(buffer);
                    } else if(cur.length > 1) {
                        buffer = buffer.split("}");
    
                        for(let i = 0, leng = buffer.length;i < leng;i++){
                            if(buffer[i].length === 0)
                                continue;
    
                            buffer[i] = JSON.parse(buffer[i] + "}");
    
                            if(buffer[i].status === "ok")
                                return buffer[i];
                            else if (buffer[i].status === "error")
                                throw buffer[i];
                            else if(run_w_progress)
                                progress(buffer[i]);
                        }
                    }
    
                    if(done) 
                        throw new Error("[BAD_RESPONCE]: " + buffer);
                }
            } catch(e) {
                console.error(e);

                if(e.status == null)
                    throw {
                        status: "error",
                        message: "error while executing request"
                    }
                
                throw e;
            }
        }
    
        async call(func, data = {}, progress) {
            if(this.session)
                if(this.session.token)
                    data.token = this.session.token;
                else {
                    data.login = this.session.login;
                    data.password = this.session.password;
                }
    
            data.function = func;
            data = JSON.stringify(data);
    
            try {
                data = await fetch(`api/${this.version}/`, {
                    headers: {
                        'Content-Type': 'application/json',
                        "Content-Length": data.length
                    },
                    method: "POST",
                    body: data
                });
                
                let decoder = new TextDecoder("utf-8"), 
                    total = data.headers.get('Content-Length'),
                    buffer = "",
                    marker = 0;
    
                data = data.body.getReader();
    
                while(true){
                    const {done, value} = await data.read();
    
                    if(!done){
                        buffer += decoder.decode(value);
                        marker += value.byteLength;
    
                        if(progress)
                            progress({
                                loaded: marker,
                                from: total
                            })
                    } else {
                        data = JSON.parse(buffer);
    
                        if(data.status !== "error")
                            return data;
                        else
                            throw data;
                    }
                }
            } catch(e) {
                console.error(e);

                if(e.status == null)
                    throw {
                        status: "error",
                        message: "error while executing request"
                    }
                
                throw e;
            }
        }
    
        async auth(login, password){
            if(login == null || password == null)
                throw new TypeError('Login data not transmitted');

            let session = new Session(login.toString(), password.toString()), successful;
    
            if(successful = await this.call("login", { login, password })){
                this.session = session;
                this.session.setToken(successful.token);

                return this;
            } else {
                throw successful;
            }
        }

        update(target){
            return this.call("update", {target});
        }

        mailing(type = 'notify', after = 0, message, files, progress){
            return this.call("mailing", {data: {content: message, attachments: files}, type, after}, progress)
        }

        statistics(){
            return this.call("statistics");
        }

        actions(from, to){
            return this.call("actions", {from, to});
        }

        logs(time, seed){
            return this.call("logs.get", {time, seed});
        }

        getUser(){
            return this.call("account")
        }
    };
})(typeof module === "object" && typeof module.exports === "object" && module.exports || window);