$(function(){
 
    $("#cp-form").submit(function(e) {
        e.preventDefault()
        
        const data = {}
        data.password = $("#cp-form-pass").val()
        data.passwordConfirm = $("#cp-form-pass2").val()
        
        $.ajax({
            type: 'post',
            url: '/profile/change-password',
            data,
            success: function(data, status) {
                $("#cp-form").slideUp()
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