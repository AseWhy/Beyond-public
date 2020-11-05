const fetch = require("node-fetch"),
	  FormData = require("form-data"),
	  { static } = require("easyvk")

module.exports.expand = function(vk) {
    if(vk.uploader){
        vk.uploader.uploadData = async function(url, buffer, fieldName = 'file', mime = 'image/jpeg', paramsUpload = {}) {
			let self = this
			
            return new Promise((resolve, reject) => {        
				if (!url || !static.isString(url)) {
					return reject(self._vk._error('is_not_string', {
						parameter: 'url',
						method: 'uploadData',
						format: 'http(s)://www.domain.example.com/path?request=get'
					}))
				}

				if (!buffer || !(buffer instanceof Buffer)) {
					return reject(self._vk._error('is_not_object', {
						parameter: 'buffer',
						method: 'uploadData',
						format: 'Buffer <...>'
					}))
				}

				if (fieldName && !static.isString(fieldName)) {
					return reject(self._vk._error('is_not_string', {
						parameter: 'fieldName',
						method: 'uploadData',
						required: false
					}))
				}
				
				const data = new FormData()

				if (static.isObject(paramsUpload)) {
					for(let key in paramsUpload){
						if (key !== fieldName) {
							data.append(key, paramsUpload[key])
						}
					}
				}

				data.append(fieldName, buffer, {
					filename: 'image.jpg',
					contentType: typeof mime === "string" ? mime : 'image/jpeg'
				});

				return fetch(url, {
					method: 'POST',
					body: data,
					agent: self._agent,
					headers: {
						...(data.getHeaders())
					}
				})
				.then(async (response) => {
					let vkr = await response.json()
			
					if (vkr) {
						if (data.custom) {
							return resolve(vkr)
						} else {
							let json = static.checkJSONErrors(vkr, reject)
			
							if (json) {
								return resolve(vkr)
							} else {
								return reject(self._vk._error('invalid_response', {
									response: response
								}))
							}
						}
					} else {
						return reject(self._vk._error('empty_response', {
							response: response
						}))
					}
				})
				.catch(reject)
			})
        }
    }
}