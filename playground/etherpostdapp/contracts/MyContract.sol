pragma solidity 0.4.24;

import "./EtherpostInterface.sol";

contract MyContract is EtherPostInterface {

  address public defValAddress = 0x0000000000000000000000000000000000000000;

  // Alternative data structure to free unstructured variables
  // Collect Image info instead of spreading it out? potential json off-chain storage to easily read vals


  // imageInfo could in theory be a Json object stored on IPFS
  // Is a struct more memory/gas efficient than multiple mappings?
  struct imageInfo {
    uint claps;
    mapping(address => bool) hasClapped;
    bytes32[] comments;
    // Some value that identifies a group this image belongs to?
    // Could store user who uploaded image as well, worse for searching all images by one user though unless we duplicate data.
    address uploader;
    bool isHidden;
    string visibleTo;
  }

  struct userInfo {
    string handle;
    bytes32[] uploads;
    string[] groups;
  }

  // General Info
  mapping(bytes32 => imageInfo) public images;
  bytes32[] imgList; // Duplicate storing of IPFS hash, but see no other way of retrieving all images without this
  mapping(address => userInfo) public users; // May need this to group images by users
  address[] activeUsers; // List of users who have uploaded an image.
  mapping(string => bool) private namesTaken;


  // USER INFO
  // User handle
  //mapping(address => string) public names;

  // For each address we store and array of ipfs hashes
  // mapping(address => bytes32[]) public uploads;

  // IMAGE INFO
  // for each ipfs hash, we store claps
  //mapping(bytes32 => uint) public claps;

  // Mapping to check if user already clapped an image
  //mapping(address => mapping(bytes32 => bool)) public myClaps;

  // for each ipfs hash, we store comments, which are also hashed on ipfs
  //mapping(bytes32 => bytes32[]) public comments;

  // Adds an ipfsHash to mapping and tracks address that uploaded

  function upload(bytes32 ipfsHash) public {
      // Check that picture is not already uploaded
      require (images[ipfsHash].uploader == defValAddress, "This image has already been uploaded");
        if (users[msg.sender].uploads.length == 0) {
          activeUsers.push(msg.sender);
        }
        users[msg.sender].uploads.push(ipfsHash);
        images[ipfsHash].uploader = msg.sender;
        imgList.push(ipfsHash);
        emit LogUpload(msg.sender, ipfsHash);
  }

  // Would it be cheaper to do this when picture is uploaded?
  function restrictImage(bytes32 ipfsHash, string keyword) public {
    require(images[ipfsHash].uploader == msg.sender, "Only uploader may restrict image");
      images[ipfsHash].isHidden = true;
      images[ipfsHash].visibleTo = keyword;
  }

  // Retrieves all ipfsHashes that a given Address has uploaded
  // Expensive sorting for keyword - but sorting front-end requries another call.
  // Alternative make hidden values available and call for every image returned whether or not to show
  function getUploads(address uploader) public returns(bytes32[]) {
    bytes32[] storage res;
    for ( uint i = 0; i < users[uploader].uploads.length; i++ ){
      if (images[users[uploader].uploads[i]].isHidden == false) {
        res.push(users[uploader].uploads[i]);
      }
    }
    return res;
  }

  function getUploads(address uploader, string keyword) public view returns(bytes32[]) {
    bytes32[] storage res;
    for ( uint i = 0; i < users[uploader].uploads.length; i++ ){
      if (images[users[uploader].uploads[i]].isHidden == false ||
         (images[users[uploader].uploads[i]].isHidden == true && compareStrings(images[imgList[i]].visibleTo, keyword))
        ) {
          res.push(users[uploader].uploads[i]);
      }
    }
    return res;
  }

  function getAllImages() public view returns(bytes32[] memory) {
    bytes32[] storage res;
    for( uint i = 0 ; i < imgList.length ; i++ ) {
      if (images[imgList[i]].isHidden == false) {
          res.push(imgList[i]);
      }
    }
    return res;
  }

  function getAllImages(string keyword) public view returns(bytes32[] memory) {
    bytes32[] storage res;
    for( uint i = 0 ; i < imgList.length ; i++ ) {
      if (images[imgList[i]].isHidden == false ||
         (images[imgList[i]].isHidden == true && compareStrings(images[imgList[i]].visibleTo, keyword))
        ) {
          res.push(imgList[i]);
      }
    }
    return res;
  }

  // Adds a clap
  // TODO: Unclap ?
  function clap(bytes32 ipfsHash) public {
    require(images[ipfsHash].hasClapped[msg.sender] == false, "User already clapped this");
      images[ipfsHash].claps++;
      images[ipfsHash].hasClapped[msg.sender] = true;
      emit LogClap(msg.sender, ipfsHash);

  }

  // Gets the clap count for a given ipfsHash
  // Would it be more gas efficient to trigger an event instead of returning a value?
  function getClapCount(bytes32 ipfsHash) public returns(uint) {
      return images[ipfsHash].claps;
  }

  // Adds a comment to image
  // How about deleting a comment again?
  function comment(bytes32 imageHash, bytes32 commentHash) public {
    images[imageHash].comments.push(commentHash);
    uint256 timestamp = block.timestamp; // Is there a better way to timestamp?
    emit LogComment(msg.sender, imageHash, commentHash, timestamp);
  }

  // Gets comments
  function getComments(bytes32 ipfsHash) public returns(bytes32[]) {
    return images[ipfsHash].comments;
  }

  function getUserHandle(address adr) public view returns(string) {
    return users[adr].handle;
  }

  function setUserHandle(string name) public {
    require(namesTaken[name] == false, 'Name is currently occupied');
      if (!compareStrings(users[msg.sender].handle, "")) {
        namesTaken[users[msg.sender].handle] = false;
      }
      namesTaken[name] = true;
      users[msg.sender].handle = name;
  }


  function getActiveUsers() public view returns (address[]) {
    return activeUsers;
  }

//String compare helper
function compareStrings (string memory a, string memory b) public view
       returns (bool) { return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))) ); }

}


