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
                            '<label for="name">Email address</label>',
                            '<input type="text" name="name" class="form-control" id="name" placeholder="name">',
                        '</div>',
                        '<div class="form-group">',
                            '<label for="passwd">Password</label>',
                            '<input type="password" name="passwd" class="form-control" id="passwd" placeholder="Password">',
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
            method: 'POST', 
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
            })
    })
}
var $loginModal = $(loginView)
function showLogin(){
    return $.Deferred(function(defer){
        $('body').removeClass('stackedit-no-overflow')
        $loginModal.modal('show')
        $loginModal.one('submit', 'form', function(){
            var $form = $(this)
            var name = $form.find('#name').val(),
                passwd = $form.find('#passwd').val()
            loginRequest({name: name, passwd: passwd}).then(
                function(res){
                    localStorage.userInfo = JSON.stringify(res)
                    defer.resolve(res)
                },
                function(msg){
                    defer.reject(msg)
                }
            )
            .always(function(){
                $loginModal.modal('hide')
            })
            return false
        })
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
    var defer = $.Deferred()
    try{
        var userInfo = JSON.parse(localStorage.userInfo)
        defer.resolve(userInfo)
    } catch(e) {
        defer = showLogin()
    }
    return defer
}

$.md.util = $.extend ({}, $.md.util, {
    isLogin: isLogin
});

})(jQuery);