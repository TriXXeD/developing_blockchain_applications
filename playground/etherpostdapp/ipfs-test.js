const IPFS = require('ipfs')
const node = new IPFS()

node.on('ready', async() => {

	// Calls version to test IFPS connection works
	const version = await node.version()
    console.log('Version:', version.version)
})