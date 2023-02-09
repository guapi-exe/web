const fs=require("fs");
module.exports={
    init:()=>{
        
    },
    enable:()=>{
        let USER=global.plugins.getPlugin("user");
        if(!fs.existsSync("/tmp/f")){
            fs.mkdirSync("/tmp/f")
        }
        event.on("http",e=>{
            let req=e.request,res=e.response;
            let path=req.url;
            if(path=="/api/upload"){
                let f=[];
                if(req.headers.token=="3ab6950d5970c57f938673911f42fd32"&&req.headers.size<134217728){
                    let length=0;
                    req.on("data",d=>{
                        length+=d.length;
                        if(length<134217728){
                            f.push(d)
                        }
                    });
                    req.on("end",()=>{
                        if(length<134217728){
                            let id=new Date().getTime();
                            let data=Buffer.concat(f);
                            logger.info(`${req.headers["x-forwarded-for"]} 上传了大小为${data.length}字节的${req.headers.filename.split(".")[1]}`);
                            fs.writeFile("/tmp/f/"+id,data,(e)=>{
                                if(e){
                                    res.end("500");
                                    logger.error(e)
                                } else {
                                    res.end(id.toString())
                                }
                            });
                            fs.readdirSync("/tmp/f/").sort((a,b)=>{return b-a}).splice(16).forEach(p=>{fs.rmSync("/tmp/f/"+p)})
                        } else {
                            logger.info(`${req.headers["x-forwarded-for"]} 上传的文件太大`);
                            res.end("403")
                        }
                    })
                } else {
                    logger.info(`${req.headers["x-forwarded-for"]} token无效或文件过大`);
                    res.end("403")
                }
            } else if(path.startsWith("/api/get")){
                logger.info(`${req.headers["x-forwarded-for"]} 访问了 /api/get`);
                let f=path.split("/api/get?")[1]?.split("id=")[1];
                if(fs.existsSync("/tmp/f/"+f)){
                    fs.readFile("/tmp/f/"+f,(e,d)=>{
                        if(e){
                            res.end("500");
                            logger.error(e)
                        } else {
                            res.end(d)
                        }
                    })
                } else {
                    res.end("404")
                }
            }
        })
    },
    name:"multimedia",
    internalName:"multimedia",
    version:"1.0.0"
}