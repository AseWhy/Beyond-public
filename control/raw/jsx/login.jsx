window.addEntryPage("login", null, (data, emitter, elements) => {
    "use strict";

    const inputs = document.getElementsByTagName("input"),
          buttons = document.getElementsByClassName("button");

    elements.submit.onclick = async () => {
        try {
            await window.api.auth(inputs[0].value, inputs[1].value);

            await loadMiniprofile()

            sessionStorage.setItem("login", inputs[0].value);
            sessionStorage.setItem("password", inputs[1].value);
            
            if(window.location.hash === "")
                buttons[0].click({target: buttons[0]});
            else {
                const target = window.location.hash.substring(1);

                for(let i = 0, leng = buttons.length;i < leng;i++) {
                    if(utils.to_url_safe(buttons[i].innerText.toLowerCase()) === target) {
                        buttons[i].click({target: buttons[i]});

                        break;
                    }
                }
            }
        } catch (err) {
            document.getElementById("error").innerText = err.message
        }
    }

    inputs[0].onkeyup = inputs[1].onkeyup = e => e.which === 0xD ? elements.submit.onclick() : null;
});