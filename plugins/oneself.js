module.exports={
  init:()=>{
  },
  enable:()=>{
    let USER=global.plugins.getPlugin("user");
    event.on("http",e=>{
      let req=e.request,res=e.response;
      let path=req.url;
      if(path=="/api/oneself"){
        logger.info(`${req.headers["x-forwarded-for"]} 访问了 /api/oneself`);
        if(USER.checkLogin(req)){
          let user=USER.getUserByName(Buffer.from(cookie(req.headers.cookie).us,"base64").toString());
          if(user){
          }
        } else {
          res.end(JSON.stringify({msg:"未登录",status:0}))
        }
      }
    });
  },
  name:"oneselfApi",
  internalName:"oneself",
  version:"1.0.0",
  dependence:["user"]
}
