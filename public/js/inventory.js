$(function () {
    $('.things-list').on('click', '.thing-item', function () {
        const { thing } = $(this).data()
        console.log(thing);
    })
})