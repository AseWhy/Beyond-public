module.exports.Logger = class Logger {
    constructor(port, name){
        this.port = port;
        this.name = name;
    }

    write(level, data){
        for(let i = 0, leng = data.length;i < leng;i++){
            if(data[i] instanceof Error)
                data[i] = data[i].stack;

            data[i] = data[i].replace(/^/gm, `[${this.name}] `);
        }

        this.port.postMessage({
            type: "write",
            level: level,
            messages: data
        })
    }

    log(...data){
        this.write("log", data);
    }

    warn(...data){
        this.write("warn", data);
    }

    error(...data){
        this.write("error", data);
    }
}