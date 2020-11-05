///
/// The app start's here
/// 
'use strict';

BigInt.prototype.toJSON = function() { return this.toString() }

const eavk = require("easyvk"),
      sql = require('sql-bricks'),
      { Worker } = require("worker_threads"),
      { join } = require("path");

// Initial app configuration
void function InitialConfig(){
    global.default_config = process.argv[2] == null;

    global.params_path = !global.default_config ?
        "./configs/" + process.argv[2] + ".json" :
        "./configs/default.json";

    global.params = require(global.params_path);

    global.params.paths.root = __dirname;
}()

////
/// загружаю модули требующие конфигурации
///
const { Logger } = require("./src/logger"); 

// Initial logger
void function InitialLogger() {   
    global.common_logger = new Logger("common");

    global.common_logger.log(
            "The app started with " +
            (global.default_config ? "default" : "custom") +
            " profile" +
                (global.default_config ? "" :
                    " [" +
                    global.params_path +
                    "]"
                )
        );

    // Очищаем старые логи
    Logger.checkLogFilesLimit();
}();

process.on('uncaughtException', err => {
    global.common_logger.error(err); // Запрещаем краши
})

///
/// Загружаю модули требующие логера
/// 
const { CommandEmitter }    = require("./src/command"),
      { CouplerEmitter }    = require("./src/coupler.emitter"),
      { OriginManager }     = require("./src/managers/game-managers/origin-manager"),
      { ItemManager }       = require("./src/managers/game-managers/item-manager"),
      { UserManager }       = require("./src/managers/user-manager"),
      { MapManager }        = require("./src/managers/game-managers/map-manager"),
      { PoolManager }       = require("./src/managers/pool-manager"),
      { UpdateManager }     = require("./src/managers/update-manager"),
      { PerkManager }       = require("./src/managers/game-managers/perk-manager"),
      { ScenarioManager }   = require("./src/managers/scenario-manager"),
      { BindManadger }      = require("./src/managers/bind-manager"),
      { GetUser }           = require("./src/ccc/ccc.core"),
      { expand }            = require("./src/vkexpand"),
      { BusinessesManager } = require("./src/managers/game-managers/businesses-manager"),
      { Response, Attachment, SQLAttachment } = require("./src/response"),
      { StatisticsManager, STAT_TYPE } = require("./src/managers/statistics-manager");

void function Main(){
    ((global.managers = new Object()) && (global.managers.pool = new PoolManager(global.params.pools, global.params.connection.mysql)))
        .on('load', () => {
            // Запускаю менеджеры
            global.managers.update      = new UpdateManager(global.params.updater);
            global.managers.statistics  = new StatisticsManager(global.params.statistics);

            // Статистика
            void function InitStatistics(){
                global.managers.statistics.registerStat("messages_received", STAT_TYPE.CUMULATIVE, false, 0, null, 'Сообщений поступило');
                global.managers.statistics.registerStat("commands_handled", STAT_TYPE.CUMULATIVE, false, 0, null, 'Команд поступило');
                global.managers.statistics.registerStat("errors_common", STAT_TYPE.CUMULATIVE, false, 0, null, 'Общих ошибок');
                global.managers.statistics.registerStat("errors_scenario", STAT_TYPE.CUMULATIVE, false, 0, null, 'Ошибок сценария');
                global.managers.statistics.registerStat("errors_managers", STAT_TYPE.CUMULATIVE, false, 0, null, 'Ошибок менеджера');
                global.managers.statistics.registerStat("iterations_launched", STAT_TYPE.NUMBER, false, 0, null, 'Всего итераций запущено');
                global.managers.statistics.registerStat("sity_handler_launched", STAT_TYPE.NUMBER, false, 0, null, 'Городских итераций запущено');
                global.managers.statistics.registerStat("sity_handler_av_time", STAT_TYPE.AVERAGE, false, 0, null, 'Среднее время выполнения городских итераций', false, 'ms');
                global.managers.statistics.registerStat("sity_business_av_time", STAT_TYPE.AVERAGE, false, 0, null, 'Среднее время выполнения итераций бизнеса', false, 'ms');
                global.managers.statistics.registerStat("total_update_av_time", STAT_TYPE.AVERAGE, false, 0, null, 'Общее среднее время обновлений', false, 'ms');
                global.managers.statistics.registerStat("command_av_handle_time", STAT_TYPE.AVERAGE, false, 0, null, 'Среднее время обработки команды', false, 'ms');
                global.managers.statistics.registerStat("command_av_handle_unit", STAT_TYPE.AVERAGE, false, 0, null, 'Среднее время обработки блока', false, 'ms');

                global.managers.statistics.registerStat("commands_handled_per_hour", STAT_TYPE.UPDATABLE, 1000 * 60 * 60, 0, (manager, index, self) => manager.getFinallyValue('messages_received'), 'Команд поступает в час', true);
                global.managers.statistics.registerStat("commands_per_hour", STAT_TYPE.UPDATABLE, 1000 * 60 * 60, 0, (manager, index, self) => manager.getFinallyValue('messages_received'), 'Сообщений поступает в час', true);
                global.managers.statistics.registerStat("errors_common_per_hour", STAT_TYPE.UPDATABLE, 1000 * 60 * 60, 0, (manager, index, self) => manager.getFinallyValue('errors_common'), 'Общих ошибок, в час', true);
                global.managers.statistics.registerStat("errors_scenario_per_hour", STAT_TYPE.UPDATABLE, 1000 * 60 * 60, 0, (manager, index, self) => manager.getFinallyValue('errors_scenario'), 'Ошибок сценария, в час', true);
                global.managers.statistics.registerStat("errors_managers_per_hour", STAT_TYPE.UPDATABLE, 1000 * 60 * 60, 0, (manager, index, self) => manager.getFinallyValue('errors_managers'), 'Ошибок менеджера, в час', true);
            }();

            /**
             * Тут работаем с вк
             */
            eavk({
                v: global.params.connection.vk.version,
                token: global.params.connection.vk.token,
                utils: {
                    uploader: true
                }
            }).then(async vk => {
                expand(vk);

                // Запускаю менеджеры
                global.managers.origin      = new OriginManager();
                global.managers.item        = new ItemManager();
                global.managers.perk        = new PerkManager();
                global.managers.map         = new MapManager(global.params.map);
                global.managers.user        = new UserManager(global.params.command_emitter.max_user_connections);
                global.managers.bind        = new BindManadger(global.params.binder);
                global.managers.businesses  = new BusinessesManager(global.params.businesses),
                global.managers.scenario    = new ScenarioManager(vk);
    
                // Подгружаем менеджеры
                void function InitManagersListeners(){
                    const Loadable = new Array(),
                          Start = Date.now();
    
                    function checkLimitation(){
                        for(let i = 0, leng = Loadable.length;i < leng;i++)
                            if(!Loadable[i].loaded)
                                return false;
    
                        global.common_logger.log('All managers loaded successfully. Spent ' + (Date.now() - Start) + " (ms)");
                    }
    
                    function errorHandler(e){
                        global.common_logger.error('An error occurred while loading the manager.', e);
    
                        process.exit(1); // Завершаем работу сервера
                    }
    
                    for(let entry of Object.values(global.managers)){
                        if(typeof entry.on === 'function'){
                            entry.on('load', checkLimitation);
                            entry.on('error', errorHandler);
    
                            Loadable.push(entry);
                        }
                    }
                }();

                global.common_logger.log("Successfully authorized " + vk.session.group_id);

                const сommand_emitter   = new CommandEmitter(global.managers.scenario),
                      connection        = await vk.bots.longpoll.connect();
                
                if(global.params.handle_vk){ // Если разрешено обрабатывать сообщения
                    // Если заходит новый пользователь, запускаем приветсвенный сценарий
                    connection.on('group_join', async data => {
                        // Если это не запрос на вступление в группу
                        if(data.join_type === 'join'){
                            // Создаем пользователя в базе.
                            сommand_emitter.call('welcome', null, await GetUser(data.user_id), new CouplerEmitter(vk, data.user_id));
                        }
                    })

                    // Если приходит сообщение от пользователя, то обрабатываем его в штатном режиме
                    connection.on('message_new', async ({ message }) => {
                        const emitter = new CouplerEmitter(vk, message.from_id, message.id);

                        // Проверяем есть ли у пользователя, активные обрабатываемые команды.
                        if(global.managers.user.addUserConnection(message.from_id))
                            // Получаем пользователя
                            try {
                                const user = await GetUser(message.from_id);

                                if(user.banned){
                                    emitter.reply("Невозможно обработать вашу команду т.к. эта возможность для вас была заблокирована администрацией.");
                                    
                                    // Удаляем пользорвателя
                                    global.managers.user.removeConnection(message.from_id)

                                    return;
                                }

                                сommand_emitter.handleCommand(message.payload != undefined ? JSON.parse(message.payload) : message.text, user, emitter);
                            } catch (e) {
                                emitter.reply("Ведутся профилактические работы. Пожалуйста, попробуйте позже.");

                                global.common_logger.error('Error while handling command.', message, e);

                                global.managers.statistics.updateStat('errors_common', 1);

                                global.managers.user.removeConnection(message.from_id);
                            }
                        else
                            // Нехер спамить...
                            emitter.reply("Мировое древо сейчас активно обрабатывает все, что вы сказали. Но ресурсы ограничены, дождитесь завершения предыдущих команд.")
                    });
                }

                // Отправляет сообщения всем пользователям.
                void function InitMessager(){
                    global.managers.bind.addExcecutor('send-message-to-all-users-0x0', async data => {
                        let users, emitter, buffer, responce = new Response();
                        
                        switch(data.type){
                            case 'game':
                                users = await global.managers.pool.sql('common', sql.select('id').from('users').where(sql.and(sql.like('registered', 1), sql.like('notify', 1))).toString());
                            break;
                            case 'notify':
                                users = await global.managers.pool.sql('common', sql.select('id').from('users').where(sql.like('notify', 1)).toString())
                            break;
                            case 'system':
                                users = await global.managers.pool.sql('common', sql.select('id').from('users').toString())
                            break;
                        }

                        users = users.map(e => e.id);

                        responce.setContent(data.content);

                        if(data.attachments){
                            for(let i = 0, leng = data.attachments.length;i < leng;i++){
                                switch(data.attachments[i].type){
                                    case 'sql-attachment':
                                        responce.addAttachment(new SQLAttachment(data.attachments[i].base, data.attachments[i].sql, 'message', data.attachments[i].type  || 'photo', data.attachments[i].mime || 'image/jpeg'))
                                    break;
                                    case 'attachment':
                                        responce.addAttachment(new Attachment(Buffer.from(data.attachments[i].data, 'hex'), 'message', data.attachments[i].type || 'photo', data.attachments[i].mime || 'image/jpeg'))
                                    break;
                                }
                            }
                        }

                        for(let i = 0, leng = users.length;i < leng;i += 99){
                            buffer = users.splice(i, i + 99);

                            if(buffer.length > 0) {
                                emitter = new CouplerEmitter(vk, buffer);

                                await emitter.reply(responce);
                            }
                        }
                    })
                }()
            });

            /**
             * Воркер с веб панелью.
             */
            void function WebPanel(){
                let control_panel = new Worker(join(global.params.paths.root, global.params.paths.web_control, "web_run_worker.js"), { workerData: global.params });

                control_panel.on("message", async msg => {
                    function reply(data){
                        control_panel.postMessage({
                            type: "response",
                            random_id: msg.random_id,
                            data: data
                        })
                    }

                    switch(msg.type){
                        case "update_manager":
                            await global.managers[msg.name].update();

                            reply({
                                status: 'ok'
                            });
                        break;
                        case "statistics":
                            reply(global.managers.statistics.getData());
                        break;
                        case "write":
                            if(!Array.isArray(msg.messages))
                                msg.messages = [msg.messages];

                            global.common_logger[msg.level].apply(global.common_logger, msg.messages);
                        break;
                    }
                })
            }();
        }).on('error', e => {
            global.common_logger.error('An error occurred while loading the pool manager.', e);

            process.exit(1); // Завершаем работу сервера
        });
}();