const Koa = require('koa');
const app = new Koa();
const server = require('koa-static');
const router = require('koa-router')();
const PouchDB = require('pouchdb');
const db = new PouchDB('http://localhost:5984/csrf');

app.use(async (ctx, next) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
});

// add url-route:
router.post('/login', async (ctx, next) => {
  let postData = await parsePostData( ctx );
  try {
    let response = await db.get(`id_${postData.name}`);
    let exp = new Date();
    ctx.cookies.set(
      'id', 
      `id_${postData.name}`,
      {
        domain: 'localhost',  // 写cookie所在的域名
        path: '/userInfo.html',       // 写cookie所在的路径
        maxAge: 24*60*60*1000, // cookie有效时长
        expires: exp.setTime(exp.getTime() + 24*60*60*1000),  // cookie失效时间
        httpOnly: false,  // 是否只用于http请求中获取
        overwrite: false  // 是否允许重写
      }
    )
    if(response.password === postData.password) ctx.redirect('userInfo.html')
    // ctx.body = "<p>登录成功，点击<a href='index.html'>这里</a>返回<script>window.onload = function() {console.log(document.cookie)}</script></p>";
  } catch (err) {
    ctx.body = "<p>登录失败，点击<a href='index.html'>这里</a>返回</p>";
  }
});

router.post('/regist', async (ctx, next) => {
  let postData = await parsePostData( ctx );
  
  postData._id = `id_${postData.name}`;
  try {
    let response = await db.put(postData);
    ctx.body = "<p>注册成功，点击<a href='index.html'>这里</a>返回至登录界面</p>";
  } catch (err) {
    ctx.body = "<p>用户名已存在，点击<a href='index.html'>这里</a>返回</p>";
  }
});


router.post('/getUserInfo', async (ctx, next) => {
  let postData = await parsePostDataFromAjax( ctx );
  let _id = {};
  _id[postData.split(':')[0]] = postData.split(':')[1];
  try {
    let doc = await db.get(_id.id);
    ctx.body = doc;
  } catch (err) {
    ctx.body = '发生错误';
  }
});

router.post('/change', async (ctx, next) => {
  let postData = await parsePostData( ctx );
  console.log(postData);
  try {
    let doc = await db.get(postData.id);
    let response = await db.put({
      _id: doc._id,
      _rev: doc._rev,
      name: postData.name,
      password: postData.password,
      sex: postData.sex,
      desc: postData.desc
    });
    ctx.body = "<p>修改成功，点击<a href='index.html'>这里</a>返回至登录界面</p>";
  } catch (err) {
    console.log(err);
  }
});

app.use(router.routes());
app.use(server(__dirname + '/'));
app.listen(3001);
/**
 * 
 * 对于POST请求的处理，koa2没有封装获取参数的方法，
 * 需要通过解析上下文context中的原生node.js请求
 * 对象req，将POST表单数据解析成query string（例
 * 如：a=1&b=2&c=3），再将query string 解析成
 * JSON格式（例如：{"a":"1", "b":"2", "c":"3"}）
 */
// 解析上下文里node原生请求的POST参数，这个是处理表单form传入参数
function parsePostData( ctx ) {
  return new Promise((resolve, reject) => {
    try {
      let postdata = "";
      ctx.req.addListener('data', (data) => {
        postdata += data
      })
      ctx.req.addListener("end",function(){
        let parseData = parseQueryStr( postdata )
        
        resolve( parseData )
      })
    } catch ( err ) {
      reject(err)
    }
  })
}
// 解析上下文里node原生请求的POST参数，这个是处理Ajax传入参数
function parsePostDataFromAjax( ctx ) {
  return new Promise((resolve, reject) => {
    try {
      let postdata = "";
      ctx.req.addListener('data', (data) => {
        postdata += data
      })
      ctx.req.addListener("end",function(){
      resolve( postdata )
      })
    } catch ( err ) {
      reject(err)
    }
  })
}

// 将POST请求参数字符串解析成JSON
function parseQueryStr( queryStr ) {
  let queryData = {}
  let queryStrList = queryStr.split('&');
  for (  let [ index, queryStr ] of queryStrList.entries()  ) {
    let itemList = queryStr.split('=')
    queryData[ itemList[0] ] = decodeURIComponent(itemList[1])
  }
  return queryData
}