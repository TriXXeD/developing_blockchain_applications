// import choo
var choo = require('choo')
var html = require('choo/html')
// import web3
var Web3 = require('web3')
// initialize choo
var app = choo()
// Import contract ABI
var contractABI = require("./MyContract.json").abiDefinition

app.use(function (state, emitter) {
    state.message = ""

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
        web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8556"))

        // Set up contract interface
        // string contractAddress = "0x1277299787e38E0441104082395c2C9202b844e4" // Given by embark simulator -> embark build
        state.contractInstance = new web3.eth.Contract(contractABI, contractAddress)
        // Get message from contract
        var msg = await getMessage(state);
        state.message = msg;
        emitter.emit('render')

        // Unlock account
        const accounts = await web3.eth.getAccounts()
        // Paste from course was missing String and Int, (Passord and duration?)
        web3.eth.personal.unlockAccount(accounts[0], "", 1000000, async function (error, result) {
            if (error) {
                console.error(error)
            }
            else {
                web3.eth.defaultAccount = accounts[0]
            }
        });
    })
})

const main = (state, emit) => {
    return html `
      <div>
        <p>
          ${state.message}
        </p>

        <br><br>

        <form onsubmit="${setMsg}" method="POST">
            <label for="message">New message:</label>
            <input type="text" id="message" name="message">
            <input type="submit" value="Set">
        </form>
      </div>`

    // Set new message
    function setMsg(e) {
        e.preventDefault();
        var data = new FormData(e.currentTarget);
        console.log("Sending message: " + data.get("message"));
        state.contractInstance.methods.setMsg(data.get("message")).send({ from: web3.eth.defaultAccount })
        .on('error', console.error)
        .on('confirmation', async (confirmationNumber, receipt) => { 
            console.log("Success! Confirmation receipt: ", receipt);
            state.message = await getMessage(state);
            emit('render');
         })
        .on('receipt', async receipt => {
            console.log("Success!", receipt);
            state.message = await getMessage(state);
            emit('render');
        });
    }
}

// create a route
app.route('/', main)

// start app
app.mount('div')


function getMessage(state) {
    return new Promise(function (resolve, reject) {
        state.contractInstance.methods.myMessage().call().then(function (response) {
            resolve(response);
        });
    });
}

