/**
 * @file scenario_manager.js
 * @description @see {@link ./docs/readme.scenario_manager.md} to more information
 * @license MIT
 */

const { readdirSync, readFileSync, statSync } = require("fs"),
      { ScenarioChain } = require("../scenario"),
      { join } = require("path"),
      { parse } = require("jsonc-parser"),
      { QueryData } = require("../querydata");

const FILE_EXTENSION_PATTERN = /\.[aA-zZ1-9аА-яЯ]+$/;

module.exports.ScenarioManager = class ScenarioManager {
    constructor(vk){
        global.common_logger.log("Start's to load the Scenario Manager");
        
        this.vk = vk;

        this.loaded = true;

        this.scenarios = new Map();

        this.update();

        global.common_logger.log("Scenario Manager successfully loaded");
    }

    /**
     * Проверяет, имеет ли пользователь активный сценарий
     * Если да, то продолжаем его выполнение, если нет, то ищем подходящий ему 
     * сценарий
     * 
     * @param {QuerryData} user целевой пользователь
     * @param {PushedCommand} command команда пользователя
     * @param {CouplerEmitter} emitter данные для ответа
     */
    async exec(command, user, emitter){
        const f_data = new QueryData(command, user);
        
        // Проверяю, если у пользователя активный сценарий, и доступен ли он в базе.
        if(user.state.id !== null && this.scenarios.get(user.state.id) !== undefined){
            f_data.setState(user.state);

            // Прордолжаю его исполнение
            await this.scenarios.get(user.state.id).exec(f_data, emitter);
        } else {
            const keys = this.scenarios.keys();

            // Ищем 
            for(let id of keys){
                // Проверяю, сблюдаются ли условия для исполнения сценария
                if(this.scenarios.get(id).canToExcecute(f_data.query)){
                    try {
                        // Устанавливаю целевой сценарий для этого пользователя
                        user.edit('state', {id, state: 0, data: this.scenarios.get(id).preset})
                        // Устанавливаем сценарий
                        f_data.setState(user.state);
                        // Начинаю его исполнение
                        await this.scenarios.get(id).exec(f_data, emitter);
                    } catch (err) {
                        global.common_logger.error("Error in call to write scenario data [" + user.id + "] with " + this.scenarios.get(id).name + ".", err);
        
                        global.managers.statistics.updateStat('errors_scenario', 1)
        
                        emitter.reply(`При обработке команды произошла ошибка, администрация уже работает над решением проблемы.`);
                    }

                    return;
                }
            }

            global.common_logger.error("Unable to select a suitable scenario for [" + user.id + "]", user);

            emitter.reply(`Не могу найти для тебя подходящий сценарий... Администрация уже работает над этой проблемой.`);
            
            f_data.disconnect();
        }
    }

    /**
     * Принудительно исполняет сценарий `s_id` для пользователя `data`.`user`
     * 
     * @param {String} s_id id сценария который нужно выполнить.
     * @param {QueryData} data Данные для исполнения
     * @param {CouplerEmitter} emitter данные для ответа
     */
    async run(s_id, data, emitter){
        if(this.scenarios.has(s_id)){
            // Начинаю его исполнение
            await this.scenarios.get(s_id).exec(data, emitter);
        } else {
            throw new TypeError(`The script ${s_id} not found`);
        }
    }

    /**
     * Принудительно устанавливает сценарий `s_id` для пользователя `data`.`user`
     * 
     * @param {String} s_id id сценария который нужно выполнить.
     * @param {QueryData} data Данные для исполнения
     * @param {CouplerEmitter} emitter данные для ответа
     */
    async apply(s_id, data, emitter){
        if(this.scenarios.has(s_id)){
            try {
                // Устанавливаю целевой сценарий для этого пользователя
                data.user.edit('state', {id: s_id, state: 0, data: this.scenarios.get(s_id).preset})
                // Устанавливаем сценарий
                data.setState(data.user.state);
                // Начинаю его исполнение
                await this.scenarios.get(s_id).exec(data, emitter);
            } catch (err) {
                global.common_logger.error("Error in call to write scenario data [" + data.user.id + "] with " + this.scenarios.get(s_id).name + ".", err);

                global.managers.statistics.updateStat('errors_scenario', 1)

                emitter.reply(`При обработке команды произошла ошибка, администрация уже работает над решением проблемы.`);
            }
        } else {
            throw new TypeError(`The script ${s_id} not found`);
        }
    }

    /**
     * Обновляет список сценариев с тем, что лежит в папке ../../scenatios/
     * 
     * @private
     */
    update(){
        let buff, _ = this;

        _.scenarios.clear();

        global.common_logger.log("Start's to load the scenario patterns");

        global.common_logger.pushIndent();

        void function ReadDir(path, pushed){
            const scenarios_d = readdirSync(path);

            for(let i = 0, leng = scenarios_d.length;i < leng;i++){
                buff = join(path, scenarios_d[i]);

                if(statSync(buff).isDirectory()){
                    ReadDir(buff, pushed + scenarios_d[i] + "/");

                    continue;
                }

                if(FILE_EXTENSION_PATTERN.exec(scenarios_d[i])[0] !== ".jsonc"){
                    global.common_logger.log(`File (${pushed + scenarios_d[i]}) was skipped [does not match pattern '.jsonc']`);
    
                    continue;
                }
    
                buff = new ScenarioChain(parse(readFileSync(buff, 'utf8').toString()), _);
    
                if(!_.scenarios.has(buff.id))
                    _.scenarios.set(buff.id, buff);
                else
                    throw new Error("Scenario " + buff.id + " already exists")
    
                global.common_logger.log("The pattern " + pushed + buff.name + "[" + buff.id + "]" + " successfully loaded");
            }
        }(join(global.params.paths.root, global.params.paths.scenario_path), global.params.paths.scenario_path + "/");

        global.common_logger.popIndent();

        global.common_logger.log("All scenario patterns was be successfully loaded");
    }

    /**
     * получает сценарий по названию
     * 
     * @param {String} name название
     */
    getScenario(name){
        return this.scenarios.get(name);
    }
}