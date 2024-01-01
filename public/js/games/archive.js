$(function(){

    $("#date").datepicker({
        dateFormat: "dd.mm.yy", 
		firstDay: 1,
        showOtherMonths: true,
		selectOtherMonths: true,
		monthNames: [ "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь" ],
		dayNamesMin: [ "Вс","Пн","Вт","Ср","Чт","Пт","Сб" ],
		dayNames: [ "Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье" ],
		onSelect: function( newDate) {
			$( "#date" ).val( newDate );
		}
    });

    $(".sel-date-btn").click(function(){
        const date = $("#date").val()
        if (!testDate(date)) {
            return alert("Некорректная дата")
        }
        const [day, month, year] = date.split('.')

        location.href = `/games/archive/${year}/${month}/${day}`
    })

    function testDate(date) {
        const regDate = /^\d{2}\.\d{2}\.\d{4}$/
        if (!regDate.test(date)) return false
        return true
    }
})