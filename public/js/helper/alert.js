(function ($) {

    class Confirm {
        constructor(message, title, btnYesText, btnNoText) {
            this.message = message
            this.title = title || ''
            this.btnYesText = btnYesText || 'ОК'
            this.btnNoText = btnNoText || 'Отмена'
            this.result = false
            this.form_id = 'bs_modal_form'
            this.form = this.makeForm()
            this.resultManagement()
        }

        getBodyInput() {
            return ''
        }

        getCancelBtn() {
            return `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${this.btnNoText}</button>`
        }

        makeForm() {
            $(`<div class="modal fade" id="${this.form_id}" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="exampleModalLabel">${this.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${this.message} ${this.getBodyInput()}</div>
                        <div class="modal-footer">
                            ${this.getCancelBtn()}
                            <button type="button" class="btn btn-primary btnYes" data-bs-dismiss="modal">${this.btnYesText}</button>
                        </div>
                    </div>
                </div>
            </div>`).appendTo($('body'))
            return document.getElementById(this.form_id)
        }

        resultManagement() {
            $(`#${this.form_id} .btnYes`).click(() => this.result = true)
        }

        async show() {
            return new Promise((resolve) => {
                const form = document.getElementById(this.form_id)
                this.form.addEventListener('hidden.bs.modal', () => {
                    resolve(this.result)
                    $(this.form).remove()
                })
                const m = new bootstrap.Modal(this.form)
                m.show()
            })
        }
    }

    class Alert extends Confirm {
        getCancelBtn() { return '' }
    }

    class Prompt extends Confirm {
        getBodyInput() {
            return `<input class="form-control" type="text">`
        }

        resultManagement() {
            this.result = ''
            $(`#${this.form_id} .btnYes`).click(() => this.result = $(`#${this.form_id} input`).val())
            this.form.addEventListener('shown.bs.modal', () => {
                $(`#${this.form_id} input`).focus()
            })
        }
    }

    class PromptNumber extends Prompt {
        getBodyInput() {
            return ` <input class="form-control" type="number">`
        }
    }

    window.alert = async (message, title, btnYesText) => {
        return (new Alert(message, title, btnYesText)).show()
    }

    window.confirm = async (message, title, btnYesText, btnNoText) => {
        return (new Confirm(message, title, btnYesText, btnNoText)).show()
    }

    window.prompt = async (message, title, btnYesText, btnNoText) => {
        return (new Prompt(message, title, btnYesText, btnNoText)).show()
    }

    window.promptNumber = async (message, title, btnYesText, btnNoText) => {
        return (new PromptNumber(message, title, btnYesText, btnNoText)).show()
    }

})(jQuery)