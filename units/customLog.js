module.exports = (error) => {
	const d = new Date().toLocaleString('ru-RU')
	if (typeof error == 'object') console.log(`[${d}] ${error.message}`)
	else console.log(`[${d}] ${error}`)
}
