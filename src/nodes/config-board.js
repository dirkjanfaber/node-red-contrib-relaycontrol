module.exports = function (RED) {
  'use strict'
  function ConfigRelayBoard (n) {
    RED.nodes.createNode(this, n)
    this.name = n.name
    this.manufacturer = n.manufacturer
    this.host = n.host
    this.port = n.port
    this.user = n.user
    this.password = n.password
    this.ports = n.ports
  }
  RED.nodes.registerType('config-relay-board', ConfigRelayBoard)
}
