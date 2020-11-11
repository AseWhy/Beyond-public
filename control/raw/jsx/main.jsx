async function loadMiniprofile(){
    const u_avatar = document.getElementById("useravatar"),
          u_name = document.getElementById("username"),
          u_role = document.getElementById("userrole"),
          m_cont = document.getElementById("maincontainer");

    if(window.api.session) {
        try {
            const user = await window.api.getUser();

            u_avatar.src = '/avatars/' + user.id;
            u_name.innerText = user.display_name;
            u_role.innerText = user.role + "#" + user.id;

            api.session.user = user;

            let buttons = document.getElementsByClassName("button"), perms;

            for(let i = 0,leng = buttons.length;i < leng;i++){
                perms = buttons[i].getAttribute('perm').split(',');

                if(user.permissions != -1)
                    for(let j = 0, j_leng = perms.length; j < j_leng; j++)
                        if(perms[j] != 'SUPER') {
                            if((user.permissions & window.config.permissions[perms[j]]) === 0){
                                perms = false;

                                break;
                            }
                        } else {
                            perms = false;

                            break;
                        }

                if(perms){
                    buttons[i].style.display = 'block';
                }
            }

            if(m_cont.classList.contains("waiting_login"))
                m_cont.classList.remove("waiting_login");
        } catch(err) {
            console.warn(err);
        }
    } else {
        u_avatar.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        u_name.innerText = "";
        u_role.innerText = "";

        if(!m_cont.classList.contains("waiting_login"))
            m_cont.classList.add("waiting_login")
    }
}

window.setGlobalExporter((exports, emitter) => {
    // Ui variables
    exports.set('Message', class Message extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                message: "Ожидание...",
                type: "tip",
                percent: 0
            };
        }

        componentDidMount(){
            const _ = emitter.addEmitter("DISPLAY_MESSAGE_UPDATE", (message, type, percent) => {
                _.setState({
                    message: typeof message === 'string' ? message : '',
                    type: type === 'tip' ? 'tip' : 'error',
                    percent: typeof percent === 'number' && percent <= 100 && percent >= 0 ? percent : 0
                })
            }) && this;
        }

        render(){
            return <div 
                class={"infotarget " + this.state.type}
                style={
                    {
                        background: "linear-gradient(90deg, var(--background-color-2) 0%,  var(--background-color-2) " + this.state.percent + "%,  var(--background-color-1) " + this.state.percent + "%,  var(--background-color-1) 100%)"
                    }
                }
            >{this.state.message}</div>
        }
    })
});

document.addEventListener("DOMContentLoaded", () => {
    let buttons = document.getElementsByClassName("button"),
        loading = false;

    for(let i = 0,leng = buttons.length;i < leng;i++)
        buttons[i].onclick = e => {
            if(!loading){
                window.location.hash = e.target.getAttribute('data-page');
                
                if(window.api.session)
                    window.loadPage(e.target.getAttribute("data-page"))
                        .then(e => {
                            loading = false;
                        })
                        .catch(err => {
                            console.error(err);

                            loading = false;
                        });
                else
                    window.loadPage("login")
                        .then(e => {
                            loading = false;
                        })
                        .catch(err => {
                            console.err(err);

                            loading = false;
                        });  

                loading = true;
            }
        }
})