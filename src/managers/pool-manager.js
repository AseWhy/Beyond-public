const mysql = require("mysql"),
      { readFile } = require("fs"),
      { join } = require("path"),
      { EventManager } = require("./event-manager");

module.exports.PoolManager = class PoolManager extends EventManager {
    constructor(config, sql){
        super(['load', 'error']);

        const _ = this;

        try {
            _.main_connection = mysql.createConnection({multipleStatements: true, host: sql.host, user: sql.username, password: sql.password});
            _.connections = new Map();

            void async function Init(){
                for(let key in sql.inits){
                    try {
                        void await function Init(){
                            global.common_logger.log(`Database initialization request '${sql.inits[key]}'`);

                            return new Promise((res, rej) => {
                                _.main_connection.query(`SHOW DATABASES LIKE '${key}'`, (err, result) => {
                                    if(err){
                                        rej(err);

                                        return;
                                    } else if(result.length > 0) {
                                        res();

                                        return;
                                    }

                                    readFile(join(global.params.paths.root, global.params.paths.sql_initors, sql.inits[key]), 'utf8', async (err, result) => {
                                        if(err) {
                                            rej(err);

                                            return;
                                        }
            
                                        _.main_connection.query(result, (err) => {
                                            if(err) {
                                                rej(err);

                                                return;
                                            }
            
                                            res();
                                        })
                                    })
                                })
                            })
                        }();
                    } catch (e) {
                        _.invoke('error', [e, _]);
                    }
                }

                _.main_connection.end();

                for(let dbname in config){
                    _.connections.set(dbname, mysql.createPool({
                        multipleStatements: true,
                        connectionLimit : 10,
                        host     : config[dbname].host || sql.host,
                        user     : config[dbname].username || sql.username,
                        password : config[dbname].password || sql.password,
                        database : config[dbname].name
                    }));
                };
        
                _.loaded = true;

                _.invoke('load', [_]);
            }()
        } catch (e) {
            _.invoke('error', [e, _]);
        }
    };

    has(id){
        return this.connections.has(id);
    }

    sql(basename, query){
        const _ = this;

        return new Promise((res, rej) => {
            if(!_.connections.has(basename)){
                rej(new Error("Base not found " + basename));

                return;
            }

            _.connections.get(basename).query(query, (error, results, fields) => {
                if(error){
                    global.common_logger.error("Error when query `" + query + "`");

                    global.managers.statistics.updateStat('errors_managers', 1)

                    rej(error);

                    return;
                }

                res(results, fields);
            })
        })
    }
}