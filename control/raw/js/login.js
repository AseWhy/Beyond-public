window.addEventListener("load", async () => {
    const buttons = document.getElementsByClassName("button");

    document.body.style.backgroundImage = `url(/backgrounds/${window.config.app_theme}/user_variator_background_${utils.getRandomIntInclusive(window.config.app_variator.down, window.config.app_variator.up)}.jpg)`

    if(sessionStorage.getItem("login") && sessionStorage.getItem("password")){
        try {
            await window.api.auth(sessionStorage.getItem("login"), sessionStorage.getItem("password"));

            await loadMiniprofile();

            if(window.location.hash === "")
                buttons[0].click({target: buttons[0]});
            else {
                const target = window.location.hash.substring(1);

                for(let i = 0, leng = buttons.length;i < leng;i++) {
                    if(utils.to_url_safe(buttons[i].innerText.toLowerCase()) == target) {
                        buttons[i].click({target: buttons[i]});

                        break;
                    }
                }
            }
        } catch (e) {
            buttons[0].click({target: buttons[0]})
        }
    } else {
        buttons[0].click({target: buttons[0]})
    }
})