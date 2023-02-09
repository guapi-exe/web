module.exports={
    init:()=>{
        
    },
    enable:()=>{
        event.on("ws",e=>{
            let data=e.data,client=e.client;
            if(data.type=="keep-alive"){
                client.send(JSON.stringify({type:"keep-alive"}))
            }
        })
    },
    name:"WSKeepAlive",
    internalName:"WSKeepAlive",
    version:"1.0.0"
}