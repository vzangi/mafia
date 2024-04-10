$(function(){
    $("div.checker").click(function(){
        $(this).prev()[0].checked = !$(this).prev()[0].checked
    })

    $("#reg-form").submit(function(e) {
        e.preventDefault()
        
        const data = {}
        data.nik = $("#reg-form-nik").val()
        data.email = $("#reg-form-email").val()
        data.password = $("#reg-form-pass").val()
        data.passwordConfirm = $("#reg-form-pass2").val()
        data.accept = $("#reg-form-accept")[0].checked * 1
        
        $.ajax({
            type: 'post',
            url: '/register',
            data,
            success: function(data, status) {
                $("#reg-form").slideUp()
                $(".success").slideDown()
            },
            error: function(data) {
                $(".alert")
                    .text(data.responseJSON[0].msg)
                    .slideDown()
            }
        })

        return false
    })
})