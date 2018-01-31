'strict mode'
const levels = document.querySelector('#levels'),
	template = levels.lastElementChild

template.querySelector('button').style.visibility = 'hidden'

function appendLevel(code) {
	const clone = template.cloneNode(true)
	clone.draggable = true
	clone.querySelector('select').value = code
	clone.querySelector('button').style.visibility = 'visible'
	levels.insertBefore(clone, template)
}

function clearLevels() {
	while (levels.firstChild !== template) {
		levels.removeChild(levels.firstChild)
	}
}

template.addEventListener('change', function () {
	appendLevel(template.querySelector('select').value)
	template.querySelector('select').value = '0F00'
})

levels.addEventListener('change', function ({target: t}) {
	if (t.value === '0F00' && t.parentNode !== template) {
		levels.removeChild(t.parentNode)
	}
})

levels.addEventListener('click', function ({target: t}) {
	if (t.tagName.toUpperCase() === 'BUTTON') {
		levels.removeChild(t.parentNode)
	}
})

{
	let dragging
	
	levels.addEventListener('dragstart', function ({target: t, dataTransfer: d}) {
		if (t.nodeName.toUpperCase() !== "LI" || t === template) {
			d.clearData()
		} else {
			dragging = t
			d.setData('text/plain', t.querySelector('select').value)
		}
	})
	
	levels.addEventListener('dragover', function ({target: t, dataTransfer: d}) {
		if (t !== dragging && t.nodeName.toUpperCase() === "LI" && d.items.length > 0) {
			levels.insertBefore(dragging, t)
		}
	})
}

document.querySelector('#presets').addEventListener('change', function ({currentTarget: t}) {
	if (levels.childElementCount <= 1 || confirm('Loading a preset will erase your current list. Continue?')) {
		clearLevels()
		const preset = t.value
		for (let i = 0; i <= preset.length - 4; i += 4) {
			appendLevel(preset.substr(i, 4))
		}
	}
	t.value = ''
})

document.querySelector('#clear').addEventListener('click', function () {
	confirm('Do you really want to clear the list?') && clearLevels()
})

document.querySelector('form').addEventListener('click', function (e) {
	if (e.target.type !== 'submit')	return
	
	e.preventDefault()
	
	const levelCodes = Array.prototype.map.call(levels.querySelectorAll('select'), s => s.value),
		params = e.currentTarget.elements
	
	if (params['random'].checked) {
		levelCodes.pop()
	}
	
	if (levelCodes.length === 0) {
		alert('No levels selected!')
		return false
	}
	
	new Promise(function (resolve, reject) {
		const xhr = new XMLHttpRequest()
		xhr.open('GET', 'json/' + params['version'].value + '.json')
		xhr.responseType = 'text'
		xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText)) : reject('Error: ' + xhr.statusText)
		xhr.onerror = () => reject('Network error')
		xhr.send()
	}).then(function (game) {
		const levelWords = Math.ceil(levelCodes.length / 2),
			asm = []
		asm.push('48' + ('00000' + (levelWords + 1 << 2 | 1).toString(16).toUpperCase()).slice(-6)) // bl to the code
		for (let i = 0; i < levelWords; ++i) {
			asm.push(levelCodes[2 * i] + (levelCodes[2 * i + 1] || '0000'))
		}
		if (!params['random'].checked || params['timer'].value !== 'none') {
			asm.push('3C80817F') // lis r4, 0x817F
		}
		if (params['timer'].value !== 'none') {
			asm.push('38000000') // li r0, 0
			asm.push('9004010C') // stw r0, 0x010C(r4)
			asm.push('38000001') // li r0, 1
			asm.push('98040101') // stb r0, 0x0101(r4)
		}
		asm.push('881F0012') // lbz r0, 0x12(r31)
		if (!params['random'].checked) {
			asm.push('2C00000F') // cmpwi r0, 15
			asm.push('40820010') // bne- 0x10
			asm.push('38000000') // li r0, 0
			asm.push('90040000') // stw r0, 0(r4)
			asm.push('4800002C') // b 0x2C
		}
		asm.push('2C000001') // cmpwi r0, 1
		if (params['random'].checked) {
			asm.push('41810030') // bgt- 0x30
			asm.push('7C6C42E6') // mftbl r3
			asm.push('3880' + ('000' + (levelCodes.length * 2).toString(16).toUpperCase()).slice(-4)) // li r4, length
			asm.push('7C032396') // divwu r0, r3, r4
			asm.push('7C0021D6') // mullw r0, r0, r4
			asm.push('7C601850') // sub r3, r3, r0
			asm.push('5463003C') // rlwinm r3, r3, 0, 0, 30
		} else {
			asm.push('41810024') // bgt- 0x24
			asm.push('80640000') // lwz r3, 0(r4)
			asm.push('38030002') // addi r0, r3, 2
			asm.push('90040000') // stw r0, 0(r4)
		}
		asm.push('7C8802A6') // mflr r4
		asm.push('7C641A2E') // lhzx r3, r4, r3
		asm.push('B07F0012') // sth r3, 0x12(r31)
		asm.push('808D' + game.fmOffset) // lwz r4, TFlagManager::smInstance
		asm.push('986400DF') // stb r3, 0xDF(r4)
		asm.push('807F0020') // lwz r3, 0x20(r31)
		
		if (asm.length % 2 === 0) {
			asm.push('60000000') // nop
		}
		asm.push('00000000')
		const geckoLines = asm.length / 2
		let gecko = 'C2' + game.injectAddr + ' ' + ('0000000' + geckoLines.toString(16).toUpperCase()).slice(-8) + '\r\n'
		for (let i = 0; i < geckoLines; ++i) {
			gecko += asm[2 * i] + ' ' + asm[2 * i + 1] + '\r\n'
		}
		
		let data
		switch (e.target.name) {
			case 'gct':
				let codes = '00D0C0DE00D0C0DE' + (
						gecko +
						(params['nosave'].checked ? game.nosave : '') +
						game.notext[params['notext'].value] +
						game.nofmvs[params['nofmvs'].value] +
						game.timer[params['timer'].value]).replace(/[^0-9A-F]/g, '') +
						'FF00000000000000'
				data = new Uint8Array(codes.length / 2)
				for (let i = 0; i < data.length; ++i) {
					data[i] = parseInt(codes.substr(2 * i, 2), 16)
				}
				break
			case 'ini':
				data = '[Gecko]\r\n$Stage list loader [Noki Doki]\r\n' + gecko +
						(params['nosave'].checked ? '$Remove saveboxes [Psychonauter]\r\n' + game.nosave : '') +
						(params['notext'].value !== 'no' ? '$Replace dialog with "!!!" [Psychonauter]\r\n' + game.notext[params['notext'].value] : '') +
						(params['nofmvs'].value !== 'no' ? '$FMV Skips [Psychonauter]\r\n' + game.nofmvs[params['nofmvs'].value] : '') +
						(params['timer'].value !== 'none' ? '$Timer [Psychonauter]\r\n' + game.timer[params['timer'].value] : '')
				break
			case 'txt':
				data = game.gameId + '\r\nSuper Mario Sunshine\r\n\r\nStage list loader [Noki Doki]\r\n' + gecko +
						(params['nosave'].checked ? '\r\nRemove saveboxes [Psychonauter]\r\n' + game.nosave : '') +
						(params['notext'].value !== 'no' ? '\r\nReplace dialog with "!!!" [Psychonauter]\r\n' + game.notext[params['notext'].value] : '') +
						(params['nofmvs'].value !== 'no' ? '\r\nFMV Skips [Psychonauter]\r\n' + game.nofmvs[params['nofmvs'].value] : '') +
						(params['timer'].value !== 'none' ? '\r\nTimer [Psychonauter]\r\n' + game.timer[params['timer'].value] : '')
				break
		}
		console.log(data)
		const file = new Blob([data], {type: 'application/octet-stream'}),
			filename = game.gameId + '.' + e.target.name
		if (navigator.msSaveOrOpenBlob) {
			navigator.msSaveOrOpenBlob(file, filename)
		} else {
			let a = document.createElement("a"),
				url = URL.createObjectURL(file)
			a.href = url
			a.download = filename
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			setTimeout(() => URL.revokeObjectURL(url), 500)
		}
	}).catch(console.error)
	
	return false
})
