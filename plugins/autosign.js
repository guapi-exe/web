let p={};
p.sign=()=>{
    for(let i in p.tasks){
        let task=p.tasks[i];
        if((task.LST?task.LST:0)+86401000<new Date().getTime()){
            p.qq.pickGroup(task.group).sendMsg(task.msg);
            task.LST=new Date().getTime()
        }
    }
    p.f.write("tasks.json",p.tasks)
};
module.exports={
    init:(f)=>{
        p.f=f;
        p.tasks=f.read("tasks.json",[])
    },
    enable:()=>{
        p.qq=plugins.getPlugin("QQBot").QQ;
        event.on("QQL",()=>{
            p.sign();
            setInterval(p.sign,600)
        });
        event.on("QQGM",e=>{
            if(e.toString().startsWith(`{at:${p.qq.uin}} 签到`)){
                e.reply("ok",true);
                p.sign()
            }
        })
    },
    out:{sign:p.sign},
    name:"autoSign",
    internalName:"autoSign",
    version:"1.0.0",
    dependence:["QQBot"],
    file:true
}