$(function(){
 
    $("#restore-form").submit(function(e) {
        e.preventDefault()
        
        const data = {}
        data.email = $("#restore-form-email").val()
        
        $.ajax({
            type: 'post',
            url: '/restore',
            data,
            success: function(data, status) {
                $("#restore-form").slideUp()
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