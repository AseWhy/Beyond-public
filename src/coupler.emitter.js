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
            }, TYPING_INTERVAL)

            return _.vk.call("messages.setActivity", {
                user_id: _.sender_id,
                type: "typing"
            });
        }

        return Typing();
    }

    async upload(uploader = "message", buffer, type = 'photo', mime = 'image/jpeg'){
        if(SERVERS[uploader.toUpperCase()] == undefined)
            throw new TypeError("Unknown uploader");

        let upload_d = (await this.vk.uploader.getUploadURL(SERVERS[uploader.toUpperCase()], {}, true)).url.upload_url;
            upload_d = await this.vk.uploader.uploadData(upload_d, buffer, type, mime, {});
            upload_d = await this.vk.post('photos.saveMessagesPhoto', upload_d);
            upload_d = upload_d[0];

        return `${type}${upload_d.owner_id}_${upload_d.id}_${upload_d.access_key}`
    }

    /**
     * Отвечает целевому сообщению
     * 
     * @param {Response|String} responce данные для ответа
     */
    reply(response){
        const _ = this;

        _.typing_cancel = true;

        if(response instanceof Response){
            let call_data = new Object();

            if(typeof _.sender_id === 'object' && _.sender_id instanceof Array)
                call_data.user_ids = _.sender_id.slice(0, 100);
            else
                call_data.user_id = _.sender_id;

            call_data.random_id = eavk.randomId();

            if(response.hasKeyboard)
                call_data.keyboard = JSON.stringify(response.keyboard);

            return (async () => {
                if(response.hasContent)
                    if(Array.isArray(response.content)){
                        const sender_data = new Object();

                        if(typeof _.sender_id === 'object' && _.sender_id instanceof Array)
                            sender_data.user_ids = _.sender_id.slice(0, 100);
                        else
                            sender_data.user_id = _.sender_id;

                        for(let i = 0, leng = response.content.length - 1;i < leng;i++)
                            await _.vk.call("messages.send", {
                                ...sender_data,
                                random_id: eavk.randomId(),
                                message: response.content[i]
                            }, 'post');

                        call_data.message = response.content[response.content.length - 1];
                    } else {
                        call_data.message = response.content;
                    }

                if(response.hasAttachments) {
                    let data;

                    call_data.attachment = new Array();

                    for(let i = 0, leng = response.attachments.length;i < leng;i++){
                        if(response.attachments[i] instanceof SQLAttachment){
                            data = await response.attachments[i].getData();

                            for(let j = 0, j_leng = data.length;j < j_leng;j++){
                                call_data.attachment.push(await _.upload(data[j].uploader, data[j].data, data.type, data.mime));
                            }
                        } else if(response.attachments[i] instanceof Attachment){
                            data = await response.attachments[i].getData();

                            call_data.attachment.push(await _.upload(data.uploader, data.data, data.type, data.mime));
                        }
                    }

                    call_data.attachment = call_data.attachment.join(',');
                }

                return await _.vk.call("messages.send", call_data, 'post');
            })()
        } else {
            const resp = new Response();

            resp.setContent(response != null ? response.toString() : "null");

            return _.reply(resp);
        }
    }
}