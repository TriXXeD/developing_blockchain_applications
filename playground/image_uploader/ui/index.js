// import choo
var choo = require('choo')
var html = require('choo/html')
// initialize choo
var app = choo()
// Buffer for files
var buffer = require('buffer')
// Initialize IPFS
var IPFS = require('ipfs-http-client')
// uncomment to use your local ipfs node
var node = IPFS('localhost', '5001', { protocol: 'http' });
// uncomment to use a remote infura ipfs node
// var node = new IPFS('ipfs.infura.io', '5001', { protocol: 'https' })

app.use(function (state, emitter) {
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
})


const main = (state, emit) => {
    let image
    if (state.ipfsUrl) {
        console.log("image set")
        image = html `<a href="${state.ipfsUrl}"><img src="${state.ipfsUrl}" /></a>`
    }

    return html `
        <div>
          <form onsubmit="${upload}" method="post">
              <label for="file">Upload:</label><br>
              <input type="file" id="file" name="file">
              <input type="submit" value="Add">
          </form>
          <br>
          ${image}
        </div>`


    function upload(e) {
        e.preventDefault()
        var file = document.getElementById('file').files[0];
        console.log(file)
        emit('upload', file)
    }
}

// create a route
app.route('/', main)
// start app
app.mount('div')
