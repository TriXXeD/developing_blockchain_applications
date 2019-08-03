const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8556')
const bs58 = require("bs58");

const MyContract = require('Embark/contracts/MyContract');

let accounts;

config({
  contracts: {
    "MyContract": {
      
    }
  }
}, (_err, web3_accounts) => {
  accounts = web3_accounts
});

// Testing that Upload functionality
it('lets us add hash to struct', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  await MyContract.methods.upload(getBytes32FromIpfsHash(testHash)).send({ from: accounts[0] })
  let uploads = await MyContract.methods.getUploads(accounts[0]).call()

  assert.equal(uploads.length, 1)
  assert.equal(getIpfsHashFromBytes32(uploads[0]), testHash)
})

it('fails to upload image which is already uploaded by that user', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  try {
    await MyContract.methods.upload(getBytes32FromIpfsHash(testHash)).send({ from: accounts[0] })
    assert.fail("Upload should throw error because image is already uploaded")
  } catch(err) {
    assert(err, "Expected error");
    assert(err.message.endsWith("This image has already been uploaded"),
    "Expected failure due to duplicate uploaded image, but got '" + err.message + "'instead.")
  }
})

it('fails to upload image which is already uploaded by another user', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  try {
    await MyContract.methods.upload(getBytes32FromIpfsHash(testHash)).send({ from: accounts[1] })
    assert.fail("Upload should throw error because image is already uploaded")
  } catch(err) {
    assert(err, "Expected error");
    assert(err.message.endsWith("This image has already been uploaded"),
    "Expected failure due to duplicate uploaded image, but got '" + err.message + "'instead.")
  }
})


it('Assigns the upload to the correct user', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLB'
  await MyContract.methods.upload(getBytes32FromIpfsHash(testHash)).send({ from: accounts[0] })
  let uploads = await MyContract.methods.getUploads(accounts[1]).call()

  assert.equal(uploads.length, 0)
})

it('Raises emits LogUpload event', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLC'
  const txResult = await MyContract.methods.upload(getBytes32FromIpfsHash(testHash)).send({ from: accounts[0] })
  const events = txResult.events
  // now we can inspect the events
  // console.log(events)
  assert.equal(accounts[0], events.LogUpload.returnValues.uploader)
  assert.equal(testHash, getIpfsHashFromBytes32(events.LogUpload.returnValues.ipfsHash))

})

// Testing Upload data reads
// This is weirdly expensive -> 234k gas
it('Lets us retrieve the uploads per user', async () => {
  let testHash0 = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLD'
  let testHash1 = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLE'
  await MyContract.methods.upload(getBytes32FromIpfsHash(testHash0)).send({ from: accounts[0] })
  await MyContract.methods.upload(getBytes32FromIpfsHash(testHash1)).send({ from: accounts[1] })
  let uploads0 = await MyContract.methods.getUploads(accounts[0]).call()
  let uploads1 = await MyContract.methods.getUploads(accounts[1]).call()
  
  assert.equal(uploads0.length, 4)
  assert.equal(uploads1.length, 1)
  assert.equal(getIpfsHashFromBytes32(uploads0[3]), testHash0)
  assert.equal(getIpfsHashFromBytes32(uploads1[0]), testHash1)
})

it('Lets us retrieve all images uploaded thus far', async() => {
  let allUploads = await MyContract.methods.getAllImages().call({ from: accounts[0] })
  assert.equal(allUploads.length, 5)
})

// Check that we can restrict access to images via keywords
it('Hides an image from the average user so getAllImages no longer finds it', async() => { 
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLE'
  await MyContract.methods.restrictImage(getBytes32FromIpfsHash(testHash), "hidden").send({ from: accounts[1] })
  let allUploads = await MyContract.methods.getAllImages().call({ from: accounts[0] })
  //console.log(allUploads)
  assert.equal(allUploads.length, 4)
})

it('Is also hidden from the user specific get', async() => { 
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLE'
  let allUploads = await MyContract.methods.getUploads(accounts[1]).call({ from: accounts[0] })
  //console.log(allUploads)
  assert.equal(allUploads.length, 0)
})

it('Only allows the original uploader to hide an image', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  try {
    await MyContract.methods.restrictImage(getBytes32FromIpfsHash(testHash), "sabotage").send({ from: accounts[2] })
    assert.fail("Upload should throw error because image is uploaded by another user")
  } catch(err) {
    assert(err, "Expected error");
    assert(err.message.endsWith("Only uploader may restrict image"),
    "Expected failure due to not being the original uploader '" + err.message + "'instead.")
  }
})

it('Shows the hidden image if we give the right keyword', async() => { 
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLE'
  let allUploads = await MyContract.methods.getAllImages("hidden").call({ from: accounts[0] })
  assert.equal(allUploads.length, 5)
})

it('Does not show the hidden element if another keyword is given', async() => { 
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLE'
  let allUploads = await MyContract.methods.getAllImages("wrongphrase").call({ from: accounts[0] })
  //console.log(allUploads)
  assert.equal(allUploads.length, 4)
})

// Let's check that we can clap
it('Lets me clap an image and emits clap event', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  const txResult = await MyContract.methods.clap(getBytes32FromIpfsHash(testHash)).send({ from: accounts[0] })
  const events = txResult.events
  let claps = await MyContract.methods.getClapCount(getBytes32FromIpfsHash(testHash)).call({ from: accounts[0] })
  assert.equal(accounts[0], events.LogClap.returnValues.clapper)
  assert.equal(testHash, getIpfsHashFromBytes32(events.LogClap.returnValues.ipfsHash))
  assert.equal(claps, 1)
})

it('Does not let the same user clap the same image twice', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  try {
    await MyContract.methods.clap(getBytes32FromIpfsHash(testHash)).send({ from: accounts[0] })
    assert.fail("Upload should throw error because image is already clapped by user")
  } catch(err) {
    assert(err, "Expected error");
    assert(err.message.endsWith("User already clapped this"),
    "Expected failure due to double clap, but got '" + err.message + "'instead.")
  }
})

it('Does let another user clap', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  await MyContract.methods.clap(getBytes32FromIpfsHash(testHash)).send({ from: accounts[1] })
  let claps = await MyContract.methods.getClapCount(getBytes32FromIpfsHash(testHash)).call({ from: accounts[0] })
  assert.equal(claps, 2)
})

// And now that we can comment
it('Lets me add comment to image & emits event', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  let commentHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLX'
  const txResult = await MyContract.methods.comment(getBytes32FromIpfsHash(testHash), getBytes32FromIpfsHash(commentHash)).send({ from: accounts[0] })
  const events = txResult.events
  let comments = await MyContract.methods.getComments(getBytes32FromIpfsHash(testHash)).call({ from: accounts [0]})
  assert.equal(accounts[0], events.LogComment.returnValues.commenter)
  assert.equal(testHash, getIpfsHashFromBytes32(events.LogComment.returnValues.imageHash))
  assert.equal(commentHash, getIpfsHashFromBytes32(events.LogComment.returnValues.commentHash))
  assert.equal(comments.length,  1)
  assert.equal(comments[0], getBytes32FromIpfsHash(commentHash))
})

it('Another user can also see the comment', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  let commentHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLX'
  let comments = await MyContract.methods.getComments(getBytes32FromIpfsHash(testHash)).call({ from: accounts [1]})
  assert.equal(comments.length,  1)
  assert.equal(comments[0], getBytes32FromIpfsHash(commentHash))
})

it('Also lets other users comment & comments do not have to be unique', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  let commentHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLX'
  await MyContract.methods.comment(getBytes32FromIpfsHash(testHash), getBytes32FromIpfsHash(commentHash)).send({ from: accounts[1] })
  let comments = await MyContract.methods.getComments(getBytes32FromIpfsHash(testHash)).call({ from: accounts [0]})
  assert.equal(comments.length,  2)
  assert.equal(comments[0], getBytes32FromIpfsHash(commentHash))
  assert.equal(comments[1], getBytes32FromIpfsHash(commentHash))
})

it('The returned array is also in order of comments as they are added', async() => {
  let testHash = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLA'
  let commentHash0 = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLX'
  let commentHash1 = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLZ'
  let commentHash2 = 'QmfCEDjJ1X41ZuopVXJKjrQzbSXm1kJ7KkeTtCFLXeynLY'
  await MyContract.methods.comment(getBytes32FromIpfsHash(testHash), getBytes32FromIpfsHash(commentHash2)).send({ from: accounts[3] })
  await MyContract.methods.comment(getBytes32FromIpfsHash(testHash), getBytes32FromIpfsHash(commentHash1)).send({ from: accounts[2] })
  let comments = await MyContract.methods.getComments(getBytes32FromIpfsHash(testHash)).call({ from: accounts [0]})
  assert.equal(comments.length,  4)
  assert.equal(comments[0], getBytes32FromIpfsHash(commentHash0))
  assert.equal(comments[1], getBytes32FromIpfsHash(commentHash0))
  assert.equal(comments[2], getBytes32FromIpfsHash(commentHash2))
  assert.equal(comments[3], getBytes32FromIpfsHash(commentHash1))
})

// Checking user name logic
it('Allows a user can add an alias', async() => {
  let testAlias0 = "Bob"
  await MyContract.methods.setUserHandle(testAlias0).send({ from: accounts[0] })
  let alias0 = await MyContract.methods.getUserHandle(accounts[0]).call({ from: accounts[0]})
  assert.equal(testAlias0, alias0)
})

it('Does not allow two users to occupy the same alias', async() => {
  let testAlias0 = "Bob"
  try {
    await MyContract.methods.setUserHandle(testAlias0).send({ from: accounts[1] })
    assert.fail("Upload should throw error because image is already clapped by user")
  } catch(err) {
    assert(err, "Expected error");
    assert(err.message.endsWith("Name is currently occupied"),
    "Expected failure due to alis being in use, got '" + err.message + "'instead.")
  }
})

it('Allows a user change their alias, that alias is open to another user when no longer used', async() => {
  let testAlias0 = "Bob"
  let testAlias1 = "Alice"
  await MyContract.methods.setUserHandle(testAlias1).send({ from: accounts[0] })
  await MyContract.methods.setUserHandle(testAlias0).send({ from: accounts[1] })
  let alias0 = await MyContract.methods.getUserHandle(accounts[0]).call({ from: accounts[0]})
  let alias1 = await MyContract.methods.getUserHandle(accounts[1]).call({ from: accounts[0]})
  assert.equal(testAlias0, alias1)
  assert.equal(testAlias1, alias0)
})


// Return bytes32 hex string from IPFS hash
function getBytes32FromIpfsHash(ipfsHash) {
  return "0x" + bs58.decode(ipfsHash).slice(2).toString('hex')
}

// Return base58 encoded ipfs hash from bytes32 hex string
function getIpfsHashFromBytes32(bytes32Hex) {
  // Add default ipfs values for first 2 bytes: function: 0x12=sha2, size: 0x20=256 bits
  // Cut off leading "0x"
  const hex = "1220" + bytes32Hex.slice(2)
  const hashBytes = Buffer.from(hex, 'hex');
  const str = bs58.encode(hashBytes)
  return str
}
