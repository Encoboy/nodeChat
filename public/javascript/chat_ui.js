//处理不受信用的信息
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

//处理系统的授信信息
function divSystemContentElemenet(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

// 处理原始的用户输入
function processUserInput(chatApp,socket) {
    var message = $('#send-message').val();
    var systemMessage;
    if(message.charAt(0) == '/'){ // 如果用户输入的内容以斜杠开头，将其作为聊天命令
        systemMessage = chatApp.processCommand(message);
        if(systemMessage){
            $('#messages').append(divSystemContentElemenet(systemMessage));
        }
    }else {
        chatApp.sendMessage($('#room').text(),message); //将非命令输入广播给其他用户
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}

//对客户端的Socket.IO 进行初始化，客户端程序初始化逻辑
var socket = io.connect();
$(document).ready(function () {
    var chatApp = new Chat(socket);
    socket.on('nameResult',function (result) {  //显示更名尝试的结果
        var message;
        if(result.success){
            message = 'You are now known as ' + result.name + '.';
        }else{
            message = result.message;
        }
        $('#messages').append(divSystemContentElemenet(message));
    });

    socket.on('joinResult',function (result) {  // 显示房间变更结果
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElemenet('Room changed.'));
    });

    socket.on('message',function (message) { //显示接受到的信息
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    socket.on('rooms',function (rooms) {  // 显示可用房间列表
        $('#room-list').empty();
        for(var room in rooms){
            room = room.substring(1,room.length);
            if(room != ''){
                $('#room-list').append(divEscapedContentElement(room));
            }
        }
        $('#room-list div').click(function () {  //点击房间名可以换到那个房间中
            chatApp.processCommand('/join' + $(this).text());
            $('#send-message').focus();
        });
    });

    setInterval(function () {  //定期请求可用房间列表
        socket.emit('rooms');
    },1000);

    $('#send-message').focus();

    $('#send-form').submit(function () {  // 提交表单可以发送聊天信息
       processUserInput(chatApp,socket);
       return false;
    });
});