pragma solidity 0.4.24;

contract EtherPostInterface {

  event LogUpload(address uploader, bytes32 ipfsHash);
  event LogClap(address clapper, bytes32 ipfsHash);
  event LogComment(address commenter, bytes32 imageHash, bytes32 commentHash, uint timestamp);

  function upload(bytes32 ipfsHash) public;
  function getUploads(address uploader) public returns(bytes32[]);
  function clap(bytes32 ipfsHash) public;
  function getClapCount(bytes32 ipfsHash) public returns(uint);
  function comment(bytes32 imageHash, bytes32 commentHash) public;
  function getComments(bytes32 ipfsHash) public returns(bytes32[]);

}