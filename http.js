const http=require("http");
const fs=require("fs");
const mime=require("mime");
const WebSocket=require("ws");

process.setMaxListeners(Infinity);

if(!fs.existsSync("root")){
    fs.mkdirSync("root")
}
if(!fs.existsSync("plugins")){
    fs.mkdirSync("plugins")
}
if(!fs.existsSync("logs")){
    fs.mkdirSync("logs")
}
global.logger={logger:fs.createWriteStream("logs/"+new Date().getTime()+".log")};
logger.info=(data)=>{
    let str="["+new Date().toLocaleString()+"][I] "+data;
    logger.logger.write(str+"\n","utf8");
    console.log(str)
};
logger.warn=(data)=>{
    let str="["+new Date().toLocaleString()+"][W] "+data;
    logger.logger.write(str+"\n","utf8");
    console.log(str)
};
logger.error=(data)=>{
    let str="["+new Date().toLocaleString()+"][E] "+data;
    logger.logger.write(str+"\n","utf8");
    console.log(str)
};
logger.fatal=(data)=>{
    let str="["+new Date().toLocaleString()+"][F] "+data;
    logger.logger.write(str+"\n","utf8");
    console.log(str);
    logger.logger.end();
    process.kill(process.pid,"SIGTERM")
};

process.on("unhandledRejection",e=>{
  logger.error(JSON.stringify(e))
});

process.stdin.setEncoding('utf8');
process.stdin.pause();
var inputLine=()=>{
    return new Promise((resolve,reject)=>{
        process.stdin.resume();
        process.stdin.on("data",data=>{
            process.stdin.pause();
            resolve(data)
        })
    })
};
async function readConsole(){
    let cmd=await inputLine();
    try{
        console.log("< "+eval(cmd))
    }catch(e){
        console.error(e)
    }
    setTimeout(()=>{readConsole()},1)
}
readConsole();

fs.readdirSync("./logs/").sort((a,b)=>{return a.slice(0,-4)>b.slice(0,-4)?-1:1}).splice(10).forEach(p=>{fs.rmSync("./logs/"+p)});

var readObj=(path,placeholder)=>{
    return fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):(()=>{fs.writeFileSync(path,placeholder?JSON.stringify(placeholder):"");return placeholder})()
};

global.blackListIP=readObj("blacklist.json",[]);

global.cookie=cookiestr=>{
    let arr=cookiestr.split("; ");
    let obj={};
    arr.forEach(c=>{
        let data=c.split("=");
        obj[data[0]]=data[1]?data[1]:true
    });
    return obj
}
global.hs=http.createServer((req,res)=>{
    try{
        let path=req.url.slice(1);
        path=path==""?"root/index.html":"root/"+path;
        (()=>{
            if(blackListIP.includes(req.connection.remoteAddress.slice(7))||blackListIP.includes(req.headers["x-forwarded-for"])){
                res.destroy();
                return
            }
            if(!req.headers["x-forwarded-for"]){
                logger.warn(`!!!???ip??????????????? ${req.connection.remoteAddress.slice(7)}!!! ????????????????????????`);
                res.destroy();
                blackListIP.push(req.connection.remoteAddress.slice(7));
                fs.writeFileSync("blacklist.json",JSON.stringify(blackListIP));
                return
            }
            event.fire("http",{request:req,response:res});
            if(!path.startsWith("root/api/")){
                if(!fs.existsSync(path)) {
                    res.writeHead(404);
                    res.end();
                    logger.warn(`?????? ${path} ????????? ??????ip: ${req.headers["x-forwarded-for"]}`);
                    return
                }
                fs.readFile(path,(error,data)=>{
                    if (error) {
                        res.writeHead(500);
                        logger.error(error)
                    } else {
                        let mimeType=mime.getType("."+path.split(".").pop());
                        res.writeHead(200,{"Content-Type":mimeType?mimeType:"text/plain"});
                        res.write(data);
                        logger.info(`ip ${req.headers["x-forwarded-for"]} ??????????????? ${path}`)
                    }
                    res.end()
                });
            }
        })();
    }catch(e){
        res.end();
        logger.error(e)
    }
}).listen(80);
logger.info("HTTP?????????????????????!");

global.event={};
(()=>{
    let eventList={};
    event.on=(name,callback)=>{
        if(!eventList[name]){
            eventList[name]=[]
        }
        eventList[name].push(callback)
    };
    event.fire=(name,data)=>{
        let event=eventList[name];
        if(!event){
            return
        }
        for(let i in event){
            try{
                event[i](data)
            }catch(e){
                logger.error(`??????????????? ${name} ?????????????????? ${e.stack}`)
            }
        }
    }
})();

global.ws={ws:new WebSocket.Server({port:8880})};
ws.sendAll=(obj)=>{
    ws.ws.clients.forEach(c=>{
        c.send(obj)
    })
};
let wsIP=[];
ws.ws.on("connection",(client,req)=>{
    (()=>{
        let realIP=req.headers["x-forwarded-for"];
        if(blackListIP.includes(req.connection.remoteAddress.slice(7))||blackListIP.includes(realIP)){
            client.close();
            return
        }
        if(!realIP){
            logger.warn(`WebSocket: !!!???ip??????????????? ${req.connection.remoteAddress.slice(7)}!!! ????????????????????????`);
            client.close();
            blackListIP.push(req.connection.remoteAddress.slice(7));
            fs.writeFileSync("blacklist.json",JSON.stringify(blackListIP));
            return
        }
        if(wsIP[realIP]){
            wsIP[realIP].send('{"type":"disconnect"}');
            wsIP[realIP].close()
        }
        wsIP[realIP]=client;
        logger.info(`WebSocket?????? ${req.headers["x-forwarded-for"]} ???????????????`);
        client.on("message",rawData=>{
            try{
                let data=JSON.parse(rawData);
                event.fire("ws",{data:data,client:client,request:req})
            }catch(e){
                logger.error(`WebSocket?????? ${req.headers["x-forwarded-for"]} ??????????????????????????????: ${e}`)
            }
        });
        client.on("close",()=>{
            logger.info(`WebSocket??? ${req.headers["x-forwarded-for"]} ???????????????`);
        })
    })()
});
logger.info("WebSocket?????????????????????!");

let readFile=(file,placeholder)=>{
    let path=file;
    try{
        return readObj(path,placeholder)
    }catch(e){
        logger.warn(`???????????????: ${path}. ????????? ${JSON.stringify(placeholder)}`);
        fs.writeFileSync(path,placeholder?JSON.stringify(placeholder):"");
        return placeholder
    }
};
if(!fs.existsSync("plugins")){
    fs.mkdirSync("plugins")
}
global.rand=(min,max)=>{
    return Math.floor(Math.random()*(max-min+1))+min
};
global.randHex=(length)=>{
    let str="";
    let hex="0123456789abcdef";
    for(let i=0;i<length;i++){
        str+=hex.charAt(rand(0,15))
    }
    return str
};
global.plugins={pluginsFiles:fs.readdirSync("plugins/"),plugins:{},getPlugin:name=>{return plugins.plugins[name].plugin.out}};
plugins.pluginsFiles.forEach(f=>{
    let filename=f.toString();
    if(filename.endsWith(".js")){
        try{
            let plugin=require("./plugins/"+filename);
            if(plugin.internalName){
                plugins.plugins[plugin.internalName]={};
                plugins.plugins[plugin.internalName].plugin=plugin;
                logger.info(`??????????????? ${plugin.name} v${plugin.version}...`);
                let rootPath="./plugins/"+plugin.internalName+"/";
                let f={
                    read:(file,placeholder)=>{
                        return readFile(rootPath+file,placeholder)
                    },
                    write:(file,data)=>{
                        fs.writeFileSync(rootPath+file,JSON.stringify(data));
                    },
                    readBin:file=>{
                        let data=readObj(rootPath+file);
                        return data
                    },
                    writeBin:(file,data)=>{
                        fs.writeFileSync(rootPath+file,data);
                    }
                };
                if(plugin.file&&!fs.existsSync(rootPath)){
                    fs.mkdirSync(rootPath)
                }
                plugin.init(f);
                plugins.plugins[plugin.internalName].state=1
            } else {
                logger.error(`${filename} ??????????????????`)
            }
        }catch(e){
            logger.error(`?????????????????? ${filename} ????????????????????????: ${e.stack}`)
        }
    }
});
for(let pluginName in plugins.plugins){
    try{
        let plugin=plugins.plugins[pluginName];
        let stop=false;
        logger.info(`???????????? ${pluginName} v${plugin.plugin.version}...`);
        if(plugin.plugin.dependence){
            for(let i in plugin.plugin.dependence){
                if(!plugins.plugins[plugin.plugin.dependence[i]]){
                    logger.warn(`?????? ${pluginName} ????????????: ${plugin.plugin.dependence[i]}. ???????????????`);
                    stop=true
                }
            }
        }
        if(!stop&&plugin.state&&plugin.plugin.enable){
            plugin.plugin.enable();
            logger.info(`?????? ${pluginName} v${plugin.plugin.version} ?????????!`)
        }
    }catch(e){
        logger.error(`??????????????? ${pluginName} ????????????????????????: ${e.stack}`)
    }
}

plugins.list=()=>{
    for(let pluginName in plugins.plugins){
        let plugin=plugins.plugins[pluginName];
        console.log(`${plugin.plugin.name} v${plugin.plugin.version} ${plugin.state?"?????????":"?????????"}`)
    }
}