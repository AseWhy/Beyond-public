const { createHash } = require("crypto");

class MessagerEntry {
    constructor(data, callback){
        this.random_id = data.random_id;
        this.callback = callback;
    }

    run(data){
        if(this.random_id !== data.random_id || data.type !== "response")
            return false;

        this.callback.call(null, data.data);

        return true;
    }
}

module.exports.Messager = class Messager {
    /**
     * 
     * @param {MessagePort} port 
     */
    constructor(port){
        this.port = port;
        this.entries = new Array();
        this.port.onmessage = msg => this.handle(msg);
    }

    send(type, data = new Object()){
        const _ = this;

        data = Object.assign({
            type: type,
            random_id: createHash("sha256").update("#" + Date.now() + (Math.random() * Number.MAX_SAFE_INTEGER) + (Math.random() * Number.MAX_SAFE_INTEGER)).digest("hex")
        }, data);

        return new Promise((res, rej) => {
            _.entries.push(new MessagerEntry(data, res))

            _.port.postMessage(data)
        })
    }

    handle(msg){
        for(let i = 0, leng = this.entries.length;i < leng;i++)
            if(this.entries[i].run(msg.data)){
                this.entries.splice(i, 1);

                return;
            }
    }
}