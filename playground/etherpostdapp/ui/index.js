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
let contractABI = require('../dist/contracts/MyContract.json').abiDefinition;

var node = IPFS('localhost', '5001', { protocol: 'http' });

// var node = new IPFS('ipfs.infura.io', '5001', { protocol: 'https' })

app.use(function (state, emitter) {
    // State setup 
    state.uploads = []
    state.nestedUploads = []
    state.activeUsers = []
    state.alias = {}
    state.keyphrase = ""


    // Set up web3 provider
    var contractAddress = "0xC486E9c9a6f75D0B70BE55661D0f6c875834EF91";

    // MetaMask & Web3 setup
    emitter.on('DOMContentLoaded', async () => {
        // Check for web3 instance. Create if necessary.
        // Access MetaMask
        if (window.ethereum) {
            try {
                await window.ethereum.enable()
            } catch (error) {
                console.log(error)
            }
        }

        // Set up web3 provider
        web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8556"))
        //web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8556"))

        // Set up contract interface
        // string contractAddress = "0x1277299787e38E0441104082395c2C9202b844e4" // Given by embark simulator -> embark build
        state.contractInstance = new web3.eth.Contract(contractABI, contractAddress)
        // Get message from contract
        // var msg = await getMessage(state);
        // state.message = msg;

        

        // Unlock account
        const accounts = await web3.eth.getAccounts()
        
        
        // Paste from course was missing String and Int, (Passord and duration?)
        web3.eth.personal.unlockAccount(accounts[1], "", 1000000, async function (error, result) {
            if (error) {
                console.error(error)
            }
        });
        web3.eth.personal.unlockAccount(accounts[0], "", 1000000, async function (error, result) {
            if (error) {
                console.error(error)
            }
            else {
                web3.eth.defaultAccount = accounts[1]
            }
        });
        // Change this to change account
        state.account = accounts[0]

        let activeUsers = await getActiveUsers(state) || []
        state.activeUsers = activeUsers
        console.log(state.activeUsers[0])
        

        //Sets up image state
        //await setImageSate(state)
        for (let i = 0; i < activeUsers.length; i++) {  
            let uploads = await getUserUploads(state, activeUsers[i], state.keyphrase) || []
            //let enrichedUploads = []
            state.nestedUploads.push([])
            let alias = await state.contractInstance.methods.getUserHandle(activeUsers[i]).call()
            state.alias[state.account] = alias
            console.log(state.alias[state.account])

            for (let j = 0; j < uploads.length; j++) {
                let hash = getIpfsHashFromBytes32(uploads[j])
                let claps = await state.contractInstance.methods.getClapCount(ipfsHashTo32Bytes(hash)).call()
                

                let comments = await getImageComments(state, ipfsHashTo32Bytes(hash)) || [];
                let upload = { ipfsHash: hash, clapCnt: claps, acc: state.account, comments: comments, node: node, uploader: activeUsers[i]}
                state.uploads.push(upload)
                //state.uploadDict[activeUsers[i]].push(upload)
                state.nestedUploads[i].push(upload)
                //enrichedUploads.push(upload)
            }
            
            //console.log(state.uploads)
            //state.uploadDict[activeUsers[i]] = enrichedUploads
        }
        
        emitter.emit('render')
        
        
        
        // Event Listening
        state.contractInstance.events.LogUpload({}, (err, event) =>{
            if (err) {
                console.error(err);
            }
            //console.log("upload event spotted, reacting")
            //const hash = getIpfsHashFromBytes32(event.returnValues.ipfsHash)
            //const user = event.returnValues.uploader
            //console.log(user)
            //const upload = { ipfsHash: hash, clapCnt: "0",  acc: state.account,  comments: [], node: node, uploader: user}
            //let uploaded = false
            //for (let i = 0; i < state.activeUsers.length; i++) {
            //    if (state.activeUsers[i] == user) {
            //        console.log(upload)
            //        console.log(i)
            //        console.log(state.nestedUploads[i])
            //        console.log(state.nestedUploads[i].length)
            //        //state.nestedUploads[i].push(upload)
            //        state.nestedUploads[i][state.nestedUploads[i].length] = upload
            //        console.log(state.nestedUploads[i].length)
            //        uploaded = true
            //        break
            //    }
            //    
            //}
            //if (uploaded == false) {
            //    state.activeUsers[state.activeUsers.length] = user
            //    state.nestedUploads[activeUsers.length-1][0] = upload
            //}
            ////state.uploads.push(upload)
            //emitter.emit('render')
            setImageSate(state, state.activeUsers, emitter)
            emitter.emit('render')
        })

        state.contractInstance.events.LogClap({}, async (err, event) => {
            if (err) {
                console.error(err);
            }

            console.log("Clap event spotted, reacting")
            let hash = getIpfsHashFromBytes32(event.returnValues.ipfsHash);
            //let count = await state.contractInstance.methods.getClapCount(ipfsHashTo32Bytes(hash)).call();
            //console.log(count)
            //
            //let uplIdx = 0
            //for (let i = 0; i < state.nestedUploads.length; i++) {
            //    
            //    for (let j = 0; j < state.nestedUploads[i].length; j++) {
            //        
            //        if (state.nestedUploads[i][j].ipfsHash == hash) {
            //            console.log("found it")
            //            state.nestedUploads[i][j].claps = count;
            //            console.log(state.uploads[uplIdx].ipfsHash)
            //            console.log(hash)
            //            state.uploads[uplIdx].claps = count
            //            
            //            break;
            //        }
            //        uplIdx++
            //    }
            //    uplIdx++
            //}
            await setStateClaps(state, hash)
            emitter.emit('render');
        });

        state.contractInstance.events.LogComment({}, async (err, event) => {
            if (err) {
              console.log(err);
            } 
            console.log("Comment event spotted, reacting")
            console.log(event.returnValues.imageHash)
            let imageHash = event.returnValues.imageHash;

            await setStateComments(state, imageHash); 
            emitter.emit('render')
        });
//
        emitter.emit('render');
    
    })

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
                let hash = result[0].hash
                console.log(state.account)

                state.contractInstance.methods.upload(ipfsHashTo32Bytes(hash)).send({ from: state.account,  gas: 5000000 })
                    .on('error', (error, receipt) => {
                        if (error.message.includes('This image has already been uploaded')) {
                            alert('Error: The file has previously been uploaded!');
                        }
                        console.error(error);
                    })
                    .on('receipt', async receipt => {
                        alert('The upload has been successfully saved to the blockchain');
                        emitter.emit('render')
                    })
                    .on('transactionHash', (hash) => {
                        alert('The upload has been successfully uploaded with hash ' + hash);
                    })

                console.log(state.account)
                console.log(state.ipfsUrl)

                emitter.emit('render')
            })
        }

        reader.readAsArrayBuffer(file)
    })
    emitter.on('alias', function (alias) {
        state.contractInstance.methods.setUserHandle(alias).send({ from: state.account,  gas: 5000000 })
        .on('error', (error, receipt) => {
            console.error(error);
        })   
        .on('receipt', async receipt => {
              state.alias[state.account] = alias
              console.log("Alias for ", state.account, " set to ", alias)         
              emitter.emit('render');
        })
        
        
    })

    emitter.on('clap', function (hash) {
        state.contractInstance.methods.clap(ipfsHashTo32Bytes(hash)).send({ from: state.account,  gas: 5000000 })
        .on('error', (error, receipt) => {
            if (error.message.includes('User already clapped this')) {
                alert('Error: You clapped this already');
            }
            console.error(error);
        })   
        .on('receipt', async receipt => {
              console.log("The clap count has been increased for upload with ipfsHash: ", hash)          
              
        })
        emitter.emit('render');
    })

    emitter.on('comment', function(ipfsHash, comment) {
        if (comment != "") {
            const buf = buffer.Buffer(comment);
            node.add(buf, (err, result) => {
              if (err) {
                console.error(err);
                return;
              }
              
              var commentHash = result[0].hash;
              console.log(state.account)
              state.contractInstance.methods.comment(ipfsHashTo32Bytes(ipfsHash), ipfsHashTo32Bytes(commentHash)).send({ from: state.account })
                .on('error', console.error)
                .on('receipt', async receipt => {
                  console.log("Comment was saved to smart contract with ipfsHash: ", commentHash);
                })
            })
        }
        emitter.emit('render')
    })

    emitter.on('hide', function(ipfsHash, keyphrase) {
        state.contractInstance.methods.restrictImage(ipfsHashTo32Bytes(ipfsHash), keyphrase).send({ from: state.account })
        .on('error', console.error)
        .on('receipt', async receipt => {
            console.log(ipfsHash, "will in the future not be shown unless keyphrase is give - any users currently viewing will still see image")
            emitter.emit('render')
        })
    })

    emitter.on('reveal', function(keyphrase) {
        state.keyphrase = keyphrase
        console.log("keyphrase set")
        console.log("calling image state")
        setImageSate(state, state.activeUsers, emitter)
        emitter.emit('render')


    })
    emitter.emit('render')
})


const main = (state, emit) => {
    let alias
    let keyphrase
    let imagetoHide
    let unveil
    if (state.ipfsUrl) {
        console.log("image set")
        image = html `<a href="${state.ipfsUrl}"><img src="${state.ipfsUrl}" /></a>`
    }
    let nonboardHtml = state.uploads.map(imageHtml)
    console.log(state.nestedUploads)
    let boardHtml = state.nestedUploads.map(userImgBoardHtml)

    return html `
        <div>
            <form onsubmit="${setAlias}" method="post">
                <label for="hash">Input an alias</label><br>
                <input type="text" name="alias" id="alias" value="${alias}">
                <input type="submit" value="Set Alias">
            </form>
        <br>
            <form onsubmit="${hide}" method="post">
            <label for="hide">Set a keyphrase on image</label><br>
            <input type="text" name="keyphrase" id="keyphrase" value="${keyphrase}">
            <br> <label for="hide">ipfs hash</label> <br>
            <input type="text" name="imgToHide" id="imgToHide" value="${imagetoHide}">
            <input type="submit" value="Hide Image">
            </form>
        <br> 
        <br>
            <form onsubmit="${reveal}" method="post">
            <label for="hide">Reveal images hidden behind a key</label><br>
            <input type="text" name="revealkey" id="revealkey" value="${unveil}">
            <input type="submit" value="Unveil the Truth!">
            </form>
        <br>
            <form onsubmit="${upload}" method="post">
                <label for="file">Upload:</label><br>
                <input type="file" id="file" name="file">
                <input type="submit" value="Add">
            </form>
        <br>
        ${boardHtml}
        </div>`
        // ${state.nestedUploads.map(userImgBoardHtml)}
        // ${state.uploads.map(imageHtml)}
    
        
    function upload(e) {
        e.preventDefault();
        let file = document.getElementById('file').files[0];
        console.log(file);
        emit('upload', file);
        emit('render');
    }

    function reveal(e) {
        e.preventDefault();
        let keyphrase = document.getElementById('revealkey').value;
        console.log(keyphrase)
        emit('reveal', keyphrase);
        emit('render');
    }

    function hide(e) {
        e.preventDefault();
        let ipfsHash = document.getElementById('imgToHide').value;
        let keyphrase = document.getElementById('keyphrase').value;
        console.log(ipfsHash, keyphrase)
        emit('hide', ipfsHash, keyphrase);
        emit('render');
    }


    function setAlias(e) {
        e.preventDefault();
        alias = document.getElementById('alias').value;
        console.log(alias);
        emit('alias', alias);
        emit('render');
    }

    function onClap(e) {
        e.preventDefault();
        let ipfsHash = e.target.value;
        console.log(ipfsHash);
        emit('clap', ipfsHash)
        emit('render');
    }

    function onComment(e) {
        e.preventDefault();
        let ipfsHash = e.target.name;
        let comment = e.target.comment.value;
        console.log(ipfsHash);
        console.log(comment);
        emit('comment', ipfsHash, comment)
        emit('render');
    }

    // Map Comments into this function
    function commentsHtml(comment) {
        return html`
        <div>
         ${comment}
        </div>
       `
    }

    // Mapping and stuff seems to fuck over re-rendering?
    function imageHtml(upload) {
        return html`
          <div class="text">
            <h4> Src: https://ipfs.io/ipfs/${upload.ipfsHash} </h4>
          </div>
          <a href="${upload.ipfsHash}"><img src="https://ipfs.io/ipfs/${upload.ipfsHash}" style="width:35%"/></a>
          ${clapHtml(upload)}
          <div class="text">
            <p> Comments Section: </p>
            ${upload.comments.map(commentsHtml)}
          </div>
          <div>
          ${newCommentHtml(upload.ipfsHash)}
          </div>
          `
    }

    function clapHtml(upload) {
        return html`
        <div class="horizontalBox">
          <button class="btn info" value="${upload.ipfsHash}" onclick="${onClap}">+</button>
          <div class="txt info">This image has ${upload.clapCnt} claps!</div>
        </div>
        `
    }

    function newCommentHtml(ipfsHash) {
        return html`
        <form onsubmit="${onComment}" name="${ipfsHash}" method="post">
          <input type="text" id="comment" name="comment" placeholder="Your comment">
          <input type="submit" value="Add">
        </form>
        `
    }

    // Map users onto this
    function userImgBoardHtml(images) {
        if(images[0] != undefined){
            return html`
            <div class="text">
                <h3>Uploads for user ${images[0].uploader} aka ${state.alias[images[0].uploader]}</h3>
            </div>
            <div class="column">
                ${images.map(imageHtml)}
            </div>
            `
        }
    }



}

// create a route
app.route('/', main)
// start app
app.mount('div')

function ipfsHashTo32Bytes(ipfsHash) {
    //let ipfsHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const bs58  = require('bs58')
    let decoded = bs58.decode(ipfsHash)
    let sliced = decoded.slice(2)
    let hex = sliced.toString('hex')
    let result = '0x' + hex
    //console.log('Encoded IPFS hash:', result)
    return result;
}

// Return base58 encoded ipfs hash from bytes32 hex string
function getIpfsHashFromBytes32(bytes32Hex) {
    // Add default ipfs values for first 2 bytes: function: 0x12=sha2, size: 0x20=256 bits
    // Cut off leading "0x"
    const bs58  = require('bs58')
    const hex = "1220" + bytes32Hex.slice(2);
    const hashBytes = Buffer.from(hex, 'hex');
    const str = bs58.encode(hashBytes);
    return str;
}

function getUserUploads(state, address, keyphrase) {
    return new Promise (function (resolve, reject) {
        state.contractInstance.methods.getUploads(address, keyphrase).call().then(function (response) {
            resolve(response);
        })
    })
}

function getActiveUsers(state) {
    return new Promise(function (resolve, reject) {
        state.contractInstance.methods.getActiveUsers().call().then(function (response) {
            resolve(response);
        })
    })
}

function getImageCommentHashes(state, imgHash) {
    return new Promise (function (resolve, reject) {
        state.contractInstance.methods.getComments(imgHash).call().then(function (response) {
            resolve(response);
        })
    })
}

async function getImageComments(state, imgHash) {
    let commentHashes = await getImageCommentHashes(state, imgHash)
    let comments = []
    

    for( let i = 0; i < commentHashes.length; i++) {
        let eComment = await node.cat(getIpfsHashFromBytes32(commentHashes[i]))
        let comment = eComment.toString('utf8')
        comments.push(comment)
    }
    return comments
}



function getClapCount(state, ipfsHash) {
    return new Promise(function (resolve, reject) {
        state.contractInstance.methods.getClapCount(ipfsHashTo32Bytes(ipfsHash)).call().then(function (response) {
            resolve(response);
        });
    });
}

function getHandle(state, acc) {
    return new Promise(function (resolve, reject) {
        state.contractInstance.methods.getUserHandle(acc).call().then(function (response) {
        })
    })
}

async function readHandle(state, acc) {
    let alias = await getHandle(state, acc)
    console.log(alias)
    return alias
}

async function setStateComments(state, imageHash) {
    let comments = await getImageComments(state, imageHash);

    for (let i = 0; i < state.activeUsers.length; i++) {
        let uploads = await getUserUploads(state, state.activeUsers[i], state.keyphrase) || []
        for ( let j = 0; j < uploads.length; j++) {
            if (uploads[j].ipfsHash == getIpfsHashFromBytes32(imageHash)) {
                state.uploads[j].comments = comments
            }
        }
    }
    for(let i = 0; i < state.uploads.length; i++) {
        
        if (state.uploads[i].ipfsHash == getIpfsHashFromBytes32(imageHash)) {
            state.uploads[i].comments = comments;
        }
    }
}

async function setStateClaps(state, imageHash) {
    let count = await getClapCount(state, imageHash);
    console.log(count)
    
    let uplIdx = 0
    for (let i = 0; i < state.nestedUploads.length; i++) {
        
        for (let j = 0; j < state.nestedUploads[i].length; j++) {
            
            if (state.nestedUploads[i][j].ipfsHash == imageHash) {
                console.log("found it")
                state.nestedUploads[i][j].clapCnt = count;
                console.log(state.uploads[uplIdx].ipfsHash)
                console.log(imageHash)
                state.uploads[uplIdx].clapCnt = count
                
                break;
            }
            uplIdx++
        }
        uplIdx++
    }
}

async function setImageSate(state, activeUsers, emitter) {
    console.log("using keyphrase:", state.keyphrase)
    activeUsers = await getActiveUsers(state) || []
    state.activeUsers = activeUsers
    state.uploads = []
    state.nestedUploads = []
    activeUsers = state.activeUsers
    console.log(activeUsers.length)
    for (let i = 0; i < activeUsers.length; i++) {  
        console.log("i: ", i)
        let uploads = await getUserUploads(state, activeUsers[i], state.keyphrase) || []
        console.log(uploads.length)
        state.nestedUploads.push([])
        let alias = await state.contractInstance.methods.getUserHandle(activeUsers[i]).call()
        state.alias[state.account] = alias
        console.log(state.alias[state.account])

        for (let j = 0; j < uploads.length; j++) {
            let hash = getIpfsHashFromBytes32(uploads[j])
            let claps = await state.contractInstance.methods.getClapCount(ipfsHashTo32Bytes(hash)).call()
            

            let comments = await getImageComments(state, ipfsHashTo32Bytes(hash)) || [];
            let upload = { ipfsHash: hash, clapCnt: claps, acc: state.account, comments: comments, node: node, uploader: activeUsers[i]}
            state.uploads.push(upload)
            //state.uploadDict[activeUsers[i]].push(upload)
            state.nestedUploads[i].push(upload)
            //enrichedUploads.push(upload)
        }
        
        //console.log(state.uploads)
        //state.uploadDict[activeUsers[i]] = enrichedUploads
    }
    //console.log(state.uploadDict)
    //console.log(state.uploadDict[state.activeUsers[0]])
    console.log(state.uploads)
    console.log(state.nestedUploads)
    emitter.emit('render')
    
}

async function fireEmit(emitter) {
    emitter.emit('render')
}