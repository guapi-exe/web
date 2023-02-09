let p={};
module.exports={
  init:(f)=>{
    p.passwords=[];
    module.exports.out.data=p.users=f.read("users.json",{});
    p.f=f;
  },
  enable:()=>{
    setInterval(()=>{
      p.f.write("users.json",p.users);
      event.fire("save");
      console.log("保存数据库中...")
    },120000);
    setInterval(()=>{
      let nowTime=new Date().getTime();
      for(let i in p.users){
        let user=p.users[i];
        if(nowTime>user.expires){
          delete user.token;
          delete user.expires
        }
      }
    },120000);
    let qq=global.plugins.getPlugin("QQBot").QQ;
    event.on("http",e=>{
      let req=e.request,res=e.response;
      let path=req.url;
      if(path=="/login.html"){
        res.setHeader("Set-Cookie",`token=0;path=/;httpOnly;expires=${new Date(0).toGMTString()}`)
      }
      if(path=="/api/login"){
        logger.info(`${req.headers["x-forwarded-for"]} 访问了 /api/login`);
        let rawData="";
        req.on("data",data=>{
          rawData+=data.toString()
        });
        req.on("end",()=>{
          if(rawData){
            try{
              let data=JSON.parse(rawData);
              let user=p.users[data.us];
              if(user){
                if(data.pw==user.pw){
                  let token=randHex(32);
                  let expires=new Date(new Date().getTime()+86400000).toGMTString();
                  user.token=token;
                  user.expires=new Date(expires).getTime();
                  res.setHeader("Set-Cookie",[`token=${token};path=/;httpOnly;expires=${expires}`,`us=${Buffer.from(data.us).toString("base64")};path=/;expires=${expires}`]);
                  res.end(JSON.stringify({msg:"登录成功",status:0}));
                  p.f.write("users.json",p.users)
                } else {
                  res.end(JSON.stringify({msg:"密码错误",status:1}))
                }
              } else {
                res.end(JSON.stringify({msg:"用户不存在",status:1}))
              }
            }catch(e){
              logger.error(`/api/login: 在处理 ${req.headers["x-forwarded-for"]} 的请求时发生了错误: ${e.stack}`)
            }
          }
        })
      }
      if(path=="/api/register"){
        let ip=req.headers["x-forwarded-for"];
        logger.info(`${ip} 访问了 /api/register`);
        let rawData="";
        req.on("data",data=>{
          rawData+=data.toString()
        });
        req.on("end",()=>{
          if(rawData){
            try{
              (()=>{
                let data=JSON.parse(rawData);
                let user=p.users[data.us];
                let qq=p.users[data.qq];
                let ip=p.users[data.ip];
                if(user){
                  res.end(JSON.stringify({msg:"用户名已被占用",status:1}));
                  return
                }
                if(qq){
                  res.end(JSON.stringify({msg:"该QQ号已被注册",status:1}));
                  return
                }
                if(!isNaN(data.us)){
                  res.end(JSON.stringify({msg:"用户名不能是纯数字",status:1}));
                  return
                }
                if(/[^0-9a-zA-Z\u4e00-\u9fa5]/.test(data.us)){
                  res.end(JSON.stringify({msg:`不合法的字符:${data.us.replace(/[0-9a-zA-Z\u4e00-\u9fa5]/g,"")}`,status:1}));
                  return
                }
                if(!data.us||!data.pw||!data.qq||isNaN(data.qq)||(data.us.length>15)||(data.pw.length>20)||(data.qq.length>15)){
                  res.end(JSON.stringify({msg:"内部错误",status:1}));
                  return
                }
                for(let i in p.users){
                  let user=p.users[i];
                  if(user.qq==data.qq||user.ip==ip){
                    res.end(JSON.stringify({msg:"内部错误",status:1}));
                    return
                  }
                }
                p.users[data.us]={us:data.us,pw:data.pw,QQ:data.qq,date:{},regTime:new Date().getTime(),ip:data.ip};
                logger.info(data.us+":"+JSON.stringify(p.users[data.us]))
                res.end(JSON.stringify({msg:`注册成功`,status:0}))
              })()
            }catch(e){
              logger.error(`/api/login: 在处理 ${ip} 的请求时发生了错误: ${e.stack}`)
            }
          }
        })
      }
    });
  },
  out:{
    getUserByName:name=>{
      return p.users[name]?p.users[name]:null
    },
    getUserByQQ:qq=>{
      for(let i in p.users){
        if(p.users[i].QQ==qq){
          return p.users[i]
        }
      }
      return null
    },
    getUserByIP:ip=>{
      for(let i in p.users){
        if(p.users[i].ip==ip){
          return p.users[i]
        }
      }
      return null
    },
    getUser:str=>{
      str=str?str:""
      if(isNaN(str)){
        if(str.includes(".")){
          return module.exports.out.getUserByIP(str)
        } else {
          if(str.startsWith("{at:")){
            return module.exports.out.getUserByQQ(Number(str.replace(/{at:/,"").replace("}","")))
          } else {
            return module.exports.out.getUserByName(str)
          }
        }
      } else {
        return module.exports.out.getUserByQQ(Number(str))
      }
    },
    isAdmin:str=>{
      let u=module.exports.out.getUser(str);
      return u?u.admin:false
    },
    checkLogin:req=>{
      if(req.headers.cookie){
        let obj=global.cookie(req.headers.cookie);
        logger.info(`${obj.token?obj.token:NaN}`);
        if((obj.token?obj.token:NaN)==(module.exports.out.getUserByName(Buffer.from(obj.us,"base64").toString())?.token)){
          logger.info(`${obj.token?obj.token:NaN}`);
          return true
        }
        return false
      } else {
        return false
      }
    },
    save:()=>{
      p.f.write("users.json",p.users);
      event.fire("save");
      console.log("保存数据库中...")
    }
  },
  name:"user",
  internalName:"user",
  version:"1.0.0",
  dependence:["QQBot"],
  file:true
}
