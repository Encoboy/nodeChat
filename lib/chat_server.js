var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

//启动Socket.IO 服务器
exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level',1);

    io.sockets.on('connection',function (socket) {
        guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed); // 在用户连接上来时赋予其一个访客名

        joinRoom(socket,'Lobby'); // 在用户名连接上来时把他放入聊天室Lobby里

        handleMessageBroadcasting(socket,nickNames); //处理用户的信息，更名，以及聊天室的创建和变更；
        handleNameChangeAttempts(socket,nickNames,namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms',function () {
            socket.emit('rooms',io.sockets.manager.rooms);
        });

        handleClientDisconnection(socket,nickNames,namesUsed);//定义用户断开连接后的清除逻辑
    })
};

//分配用户昵称
function assignGuestName(socket) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult',{
        success:true,
        name:name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

//进入聊天室
function joinRoom(socket,room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult',{room:room}); //让用户知道他们进入了新的房间
    socket.broadcast.to(room).emit('message',{ // 让房间里的其他用户知道新用户进入了房间
        text:nickNames[socket.id] + ' has joined ' + room + '.'
    });
    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.length > 1){  // 如果不止一个用户在这个房间，汇总下都是谁
        var usersInRoomSummary = ' Users currently in  ' + room + ':';
        for(var index in usersInRoom){
            var userSocketId = usersInRoom[index].id;
            if(userSocketId != socket.id){
                if(index>0){
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message',{text:usersInRoomSummary}); //将房间里其他用户的汇总发送个这个用户
    }
}

//更名请求的处理逻辑
function handleNameChangeAttempts(socket,nickNames,namesUsed) {
    socket.on('nameAttempt',function (name) {
        if(name.indexOf('Guest') == 0){ //昵称不能以Guest开头
            socket.emit('nameResult',{
                success:false,
                message:'Names cannot begin with "Guest".'
            });
        }else{
            if(namesUsed.indexOf(name) == -1){
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex]; // 删除掉之前用的昵称，让其他用户可以用
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName + ' is now known as ' + name + '.'
                });
            }else{
                socket.emit('nameResult',{ //如果昵称已经被占用，给客户端发送错误的信息
                    success:false,
                    message:'That name is already ini use'
                })
            }
        }
    })
}

// 处理用户的信息，socket.IO 的broadcast函数是用来转发信息的；
function handleMessageBroadcasting(socket) {
    socket.on('message',function (message) {
        socket.broadcast.to(message.room).emit('message',{
            text:nickNames[socket.id] + ': ' + message.text
        })
    })
}

//创建房间  更换房间功能
function handleRoomJoining(socket) {
    socket.on('join',function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    })
}

//用户断开连接
function handleClientDisconnection(socket) {
    socket.on('disconnect',function () {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}