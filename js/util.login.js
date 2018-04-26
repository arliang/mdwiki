(function($){

var loginView = [
    '<div id="loginModal" class="modal fade" tabindex="-1" role="dialog">',
        '<div class="modal-dialog" role="document">',
            '<div class="modal-content">',
                '<div class="modal-header">',
                    '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
                    '<h4 class="modal-title">请登陆</h4>',
                '</div>',
                '<div class="modal-body">',
                    '<form>',
                        '<div class="form-group">',
                            '<label for="name">用户名</label>',
                            '<input type="text" name="name" class="form-control" id="name" placeholder="请输入用户名，使用oa系统的账号">',
                        '</div>',
                        '<div class="form-group">',
                            '<label for="passwd">密码</label>',
                            '<input type="password" name="passwd" class="form-control" id="passwd" placeholder="请输入密码">',
                        '</div>',
                        '<button type="submit" class="btn btn-default">登录</button>',
                    '</form>',
                '</div>',
            '</div>',
        '</div>',
    '</div>',
].join('\n')

function loginRequest(loginData){
    return $.Deferred(function (defer){
        $.ajax({
            url: '/api/login.php',
            type: 'POST', 
            data: loginData
        }).then(
            function(res){
                // 'token'=>'sdfsgdgd','name'=>'test'
                if(res && res.result){
                    defer.resolve(res.data)
                    window.localStorage.userInfo = res.data
                } else {
                    defer.reject(res.msg)
                }
            },
            function(error){
                defer.reject('无法连上服务器')
            }
        )
    })
}
var $loginModal = $(loginView)

var loginOk = function(res){

}

var loginError = function(msg){

}

$loginModal.on('submit', 'form', function(){
    var $form = $(this)
    var name = $form.find('#name').val(),
        passwd = $form.find('#passwd').val()
    
    loginRequest({name: name, passwd: passwd}).then(
        function(res){
            loginOk(res)
        },
        function(msg){
            loginError(msg)
        }
    )
    return false
})

function showLogin(){
    return $.Deferred(function(defer){
        $('body').removeClass('stackedit-no-overflow')
        $('.stackedit-container').hide()
        $loginModal.modal('show')

        loginOk = function(res){ // 登录成功
            localStorage.userInfo = JSON.stringify(res)
            $.cookie('token', res.token, {expires: +new Date + res.expires})
            $.cookie('username', res.username, {expires: +new Date + res.expires})

            $loginModal.modal('hide')
            if($('.stackedit-container').length){
                $('.stackedit-container').show()
                if(!$('body').is('.stackedit-no-overflow')){
                    $('body').addClass('stackedit-no-overflow')
                }
            }
            defer.resolve(res)
        }
        loginError = function(msg){ // 登录失败
            alert(msg)
        }


        $loginModal.one('hide.bs.modal', function(){
            console.log(defer)
            if(defer.state() == 'pending'){
                defer.reject('close')
            }
        })
        return defer
    })
}

function isLogin(){
    var username = $.cookie('username')
    var token = $.cookie('token')
    if(username && token){
        return {
            username: username,
            token: token
        }
    } else {
        return false
    }
}

function logout(){
    $.removeCookie('username')
    $.removeCookie('token')
}

$.md.util = $.extend ({}, $.md.util, {
    isLogin: isLogin,
    showLogin: showLogin,
    logout: logout
});

})(jQuery);