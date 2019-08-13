var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime'); //附加的mime模块有根据文件扩展名得出MIME类型的能力
var chatServer = require('./lib/chat_server');
var cache = {};//cache 用来缓存文件内容的对象



//请求文件不存在发送404
function send404(response) {
    response.writeHead(404,{'Content-Type':'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

//提供文件数据
function sendFile(response,filePath,fileContents) {
    response.writeHead(
        200,
        {"content-type":mime.getType(path.basename(filePath))}
    );
    response.end(fileContents);
}

//提供静态文件服务
function serveStatic(response,cache,absPath) {
    if(cache[absPath]){
        sendFile(response,absPath,cache[absPath])
    }else{
        fs.exists(absPath,function (exists) {
            if(exists){
                fs.readFile(absPath,function (err,data) {
                    if(err){
                        send404(response);
                    }else{
                        cache[absPath] = data;
                        sendFile(response,absPath,data); //从硬盘中读取文件并返回
                    }
                });
            }else{
                send404(response); //发送HTTP 404响应
            }
        })
    }
}

//创建HTTP服务器的逻辑
var server = http.createServer(function (request,response) {
    var filePath = false;
    if(request.url == '/'){
        filePath = 'public/index.html';  // 确定返回的默认HTML文件
    }else{
        filePath = 'public' + request.url; // 将URL路径转化为文件的相对路径
    }
    var absPath = './' + filePath;
    serveStatic(response,cache,absPath);
});

server.listen(3000,function () {
    console.log("Sever listening on port 3000.");
});

chatServer.listen(server); //启动Socket.IO服务器，给它提供一个已经定义好的HTTP服务器，这样它就能跟HTTP服务器共享同一个TCP/IP 端口；