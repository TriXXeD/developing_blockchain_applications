// import choo
var choo = require('choo')
var html = require('choo/html')
// initialize choo
var app = choo()
// Buffer for files
var buffer = require('buffer')
// Initialize IPFS
var IPFS = require('ipfs-http-client')


//Web3 stuff
let Web3 = require('web3');
//let contractABI = require('./dist/contracts/EtherPost.json').abiDefinition;

var node = IPFS('localhost', '5001', { protocol: 'http' });
// Remote node: exhibits same slow upload issues as local node
// var node = new IPFS('ipfs.infura.io', '5001', { protocol: 'https' })

app.use(function (state, emitter) {
    // Access MetaMask
    //if (window.ethereum) {
    //    try {
    //        await window.ethereum.enable()
    //    } catch (error) {
    //        console.log(error)
    //    }
    //}
    // State setup 
    // Set up web3 provider
    //web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8556"))
    // Set up contract interface
    // string contractAddress = "0x1277299787e38E0441104082395c2C9202b844e4" // Given by embark simulator -> embark build
    //state.contractInstance = new web3.eth.Contract(contractABI, contractAddress)
    // Get message from contract
    //var msg = await getMessage(state);
    //const accounts = await web3.eth.getAccounts();
    //state.account = accounts[0];
    // Unlock account
    //const accounts = await web3.eth.getAccounts()
    // Paste from course was missing String and Int, (Passord and duration?)
    //web3.eth.personal.unlockAccount(accounts[0], "", 1000000, async function (error, result) {
    //    if (error) {
    //        console.error(error)
    //    }
    //    else {
    //        web3.eth.defaultAccount = accounts[0]
    //    }
    //});

    //Event Example
    // contractInstance.events.EVENTNAME((err, event) = > {
    //    if(err) {
    //        console.log(err)
    //    }
    //    // Some Action
    //    state.contractInstance.methods.FUNC().send({from: web3.eth.defaultAccount });
    //    alert(event)
    //})

    emitter.on('upload', function (file) {
        const reader = new FileReader();
        reader.onloadend = function () {
            const buf = buffer.Buffer(reader.result)
            node.add(buf, (err, result) => {
                if (err) {
                    console.error(err)
                    return
                }
                console.log(result[0].hash)
                state.ipfsUrl = `https://ipfs.io/ipfs/${result[0].hash}`
                console.log(state.ipfsUrl)
                emitter.emit('render')
            })
        }

        reader.readAsArrayBuffer(file)
    })
    emitter.on('search', function (hash) {
        node.cat(hash, (err, result) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('Content of file:', result);
            state.ipfsUrl = `https://ipfs.io/ipfs/${hash}`;

            emitter.emit('render');
        })
    })
})


const main = (state, emit) => {
    let image
    let hash
    if (state.ipfsUrl) {
        image = html `<a href="${state.ipfsUrl}"><img src="${state.ipfsUrl}" /></a>`
        console.log("image set")
    }

    return html `
        <div>
            <form onsubmit="${search}" method="post">
                <label for="hash">Search a file by its hash:</label><br>
                <input type="text" name="hash" id="hash" value="${hash}">
                <input type="submit" value="Search">
            </form>
        <br>
            <form onsubmit="${upload}" method="post">
                <label for="file">Upload:</label><br>
                <input type="file" id="file" name="file">
                <input type="submit" value="Add">
            </form>
        <br>
          ${image}
        </div>`


    function upload(e) {
        e.preventDefault();
        let file = document.getElementById('file').files[0];
        console.log(file);
        emit('upload', file);
    }

    function search(e) {
        e.preventDefault();
        hash = document.getElementById('hash').value;
        console.log(hash);
        emit('search', hash);
    }
}

// create a route
app.route('/', main)
// start app
app.mount('div')

function ipfsHashTo32Bytes() {
    let ipfsHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const bs58  = require('bs58')
    let decoded = bs58.decode(ipfsHash)
    let sliced = decoded.slice(2)
    let hex = sliced.toString('hex')
    let result = '0x' + hex
    console.log('Encoded IPFS hash:', result)
}

// Return base58 encoded ipfs hash from bytes32 hex string
function getIpfsHashFromBytes32(bytes32Hex) {
    // Add default ipfs values for first 2 bytes: function: 0x12=sha2, size: 0x20=256 bits
    // Cut off leading "0x"
    const hex = "1220" + bytes32Hex.slice(2);
    const hashBytes = Buffer.from(hex, 'hex');
    const str = bs58.encode(hashBytes);
    return str;
}