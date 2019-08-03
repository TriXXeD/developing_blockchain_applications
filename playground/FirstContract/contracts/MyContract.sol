pragma solidity 0.4.24;

contract MyContract {

  string public myMessage = "";
  address public owner;

  constructor (string _message) public {
    myMessage = _message;
    owner = msg.sender;
  }

  function setMsg (string _message) public {
    require(owner == msg.sender, "sender is not owner");
      myMessage = _message;
  }

  function setOwner (address _newOwner) public {
    owner = _newOwner;
  }

}
