const eavk = require("easyvk"),
      { Response, SQLAttachment, Attachment } = require("./response");

const TYPING_INTERVAL = 9.5 * 1000 * 60, // 9.5 sec
      TYPIND_MULT_SPEED = 10;            // 100 знаков в секунду


const SERVERS = {
    "MESSAGE": "photos.getMessagesUploadServer"
}

/**
 * Предоставляет интефейс ответа полльзователю, все используемые функции связанные с вк будут базироватся тут
 */
module.exports.CouplerEmitter = class CouplerEmitter {
    constructor(vk, s_id, m_id){
        this.vk = vk;
        this.sender_id = s_id;
        this.message_id = m_id;
        this.typing_speed = TYPIND_MULT_SPEED;
        this.typing_cancel = false;
    }

    /**
     * Устанавливает статус набора текста для пользователя
     */
    typing(){
        const _ = this;

        function Typing(){
            setTimeout(() => {
                if(!_.typing_cancel)
                    Typing();
                else
                    _.typing_cancel = false;
            }, TYPING_INTERVAL);

            (async function Transaction(step){
                if(step < global.params.max_vk_transactions_attempts)
                    try {
                        return _.vk.call("messages.setActivity", {
                            user_id: _.sender_id,
                            type: "typing"
                        });
                    } catch (e) {
                        Transaction(step + 1);
                    }
                else {
                    global.common_logger.warn("The maximum number of attempts has been exceeded and the typing state cannot be sent");
                }
            })(0);
        }

        return Typing();
    }

    async upload(uploader = "message", buffer, type = 'photo', mime = 'image/jpeg'){
        if(SERVERS[uploader.toUpperCase()] == undefined)
            throw new TypeError("Unknown uploader");

        let upload_d, successfully = true, _ = this;

        await (async function Transaction(step){
            if(step < global.params.max_vk_transactions_attempts)
                try {
                    upload_d = (await _.vk.uploader.getUploadURL(SERVERS[uploader.toUpperCase()], {}, true)).url.upload_url;
                } catch (e) {
                    console.log(e);

                    await Transaction(step + 1);
                }
            else {
                global.common_logger.warn("The maximum number of attempts has been exceeded and the file cannot be sent: 0x0");

                successfully = false;
            }
        })(0);

        if(successfully)
            await (async function Transaction(step){
                if(step < global.params.max_vk_transactions_attempts)
                    try {
                        upload_d = await _.vk.uploader.uploadData(upload_d, buffer, type, mime, {});
                    } catch (e) {
                        await Transaction(step + 1);
                    }
                else {
                    global.common_logger.warn("The maximum number of attempts has been exceeded and the file cannot be sent: 0x1");
                    
                    successfully = false;
                }
            })(0);

        if(successfully)
            await (async function Transaction(step){
                if(step < global.params.max_vk_transactions_attempts)
                    try {
                        upload_d = (await _.vk.post('photos.saveMessagesPhoto', upload_d))[0];
                    } catch (e) {
                        await Transaction(step + 1);
                    }
                else {
                    global.common_logger.warn("The maximum number of attempts has been exceeded and the file cannot be sent: 0x2");

                    successfully = false;
                }
            })(0);
        
        if(successfully) {
            return `${type}${upload_d.owner_id}_${upload_d.id}_${upload_d.access_key}`;
        }
    }

    /**
     * Отвечает целевому сообщению
     * 
     * @param {Response|String} responce данные для ответа
     */
    async reply(response){
        const _ = this;

        _.typing_cancel = true;

        if(response instanceof Response){
            let call_data = new Object();

            if(typeof _.sender_id === 'object' && _.sender_id instanceof Array)
                call_data.peer_ids = _.sender_id.slice(0, 99);
            else
                call_data.peer_id = _.sender_id;

            call_data.random_id = eavk.randomId();

            if(response.hasKeyboard && (call_data.peer_id == null || call_data.peer_id < 2000000000 && call_data.peer_id >= 0))
                call_data.keyboard = JSON.stringify(response.keyboard);

            if(response.hasContent)
                if(Array.isArray(response.content)){
                    const sender_data = new Object();

                    if(typeof _.sender_id === 'object' && _.sender_id instanceof Array)
                        sender_data.peer_ids = _.sender_id.slice(0, 99);
                    else
                        sender_data.peer_id = _.sender_id;

                    for(let i = 0, leng = response.content.length - 1;i < leng;i++)
                        await (async function Transaction(step){
                            if(step < global.params.max_vk_transactions_attempts)
                                try {
                                    await _.vk.call("messages.send", {
                                        ...sender_data,
                                        random_id: eavk.randomId(),
                                        message: response.content[i]
                                    }, 'post');
                                } catch (e) {
                                    await Transaction(step + 1);
                                }
                            else
                                global.common_logger.warn("The maximum number of attempts has been exceeded and the message cannot be sent")
                        })(0);

                    call_data.message = response.content[response.content.length - 1];
                } else {
                    call_data.message = response.content;
                }

            if(response.hasAttachments) {
                let data, buffer;

                call_data.attachment = new Array();

                for(let i = 0, leng = response.attachments.length;i < leng;i++){
                    if(response.attachments[i] instanceof SQLAttachment){
                        data = await response.attachments[i].getData();

                        for(let j = 0, j_leng = data.length;j < j_leng;j++){
                            buffer = await _.upload(data[j].uploader, data[j].data, data.type, data.mime);
                            
                            if(buffer != null)
                                call_data.attachment.push(buffer);
                        }
                    } else if(response.attachments[i] instanceof Attachment){
                        data = await response.attachments[i].getData();

                        data = await _.upload(data.uploader, data.data, data.type, data.mime);

                        if(data != null)
                            call_data.attachment.push(data);
                    }
                }

                call_data.attachment = call_data.attachment.join(',');
            }

            await (async function Transaction(step){
                if(step < global.params.max_vk_transactions_attempts)
                    try {
                        await _.vk.call("messages.send", call_data, 'post');
                    } catch (e) {
                        await Transaction(step + 1);
                    }
                else
                    global.common_logger.warn("The maximum number of attempts has been exceeded and the message cannot be sent")
            })(0);
        } else {
            const resp = new Response();

            resp.setContent(response != null ? response.toString() : "null");

            return await _.reply(resp);
        }
    }
}