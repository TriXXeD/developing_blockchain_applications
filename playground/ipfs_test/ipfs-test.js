const IPFS = require('ipfs')
const node = new IPFS()

node.on('ready', async() => {

	// Calls version to test IFPS connection works
	const version = await node.version()
	console.log('Version:', version.version)
	
	// Adds a 'Hello World' file to IPFS
	const fileToAdd = await node.add({
		path: 'helloworld.txt',
		content: Buffer.from('Hello, RMIT!\nFrom: the Blockchain Application Developer.')
	})
	
	// Prints ACK that file was added
	console.log('Added file to IPFS:', fileToAdd[0].path, fileToAdd[0].hash)
	
	// Retrieve the just added file from IPFS
	const fileBuffer = await node.cat(fileToAdd[0].hash)
	console.log('Content of file:', fileBuffer.toString())	
})

