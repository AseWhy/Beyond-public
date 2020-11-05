/**
 * @file event-manager.js
 * @description наследуемый класс который дает возможность управлять событиями классов которые его наследуют
 * @license MIT
 */

module.exports.EventManager = class EventManager {
    constructor(event_types){
        this.handlers = new Object();
        this.event_types = event_types || new Array();
    }

    /**
     * Добавляет функцию в очередь ожидания события
     * 
     * @param {String} type тип ивента
     * @param {Function} handler иполняемая функция
     */
    on(type, handler) {
        if(this.event_types.indexOf(type) === -1)
            throw new Error("Unknown event type");

        if(!this.handlers[type])
            this.handlers[type] = new Array();

        this.handlers[type].push(handler);

        return this;
    }

    /**
     * Удаляет из списка исполняемых функций фукнцию для конкретного события
     * 
     * @param {String} type тип события функции
     * @param {Function} handler удаляемая функция
     */
    removeListener(type, handler) {
        if(this.event_types.indexOf(type) === -1)
            throw new Error("Unknown event type");

        let index = 0;

        if(this.handlers[type] && (index = this.handlers[type].indexOf(handler)) != -1)
            this.handlers[type].splice(index, 1);
    }

    /**
     * Очищает список функций ддля события `type`
     * 
     * @param {String} type тип события
     */
    clearListeners(type) {
        if(this.event_types.indexOf(type) === -1)
            throw new Error("Unknown event type");

        this.handlers[type] = null;
    }

    /**
     * Вызывает событие `type`
     * 
     * @param {String} type Тип события
     * @param {Array<any>} args аргументы для вызова функций
     */
    invoke(type, args = new Array()) {
        if(this.event_types.indexOf(type) === -1)
            throw new Error("Unknown event type");
        
        if(this.handlers[type] != null)
            for(let i = 0, leng = this.handlers[type].length;i < leng;i++){
                if(this.handlers[type].length != leng){
                    i -= leng - this.handlers[type].length;
                    leng = this.handlers[type].length;
                }

                this.handlers[type][i].apply(this, args);
            }
    }
}