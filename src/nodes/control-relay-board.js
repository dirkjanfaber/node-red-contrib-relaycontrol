const axios = require('axios')
const net = require('net')
const path = require('path')
const packageJson = require(path.join(__dirname, '../../', 'package.json'))

module.exports = function (RED) {
  function SwitchDevantech (config, node, msg, cmd) {
    const host = node.board.host
    const port = Number(node.board.port)
    const dev = cmd === '1' ? 'DOA' : 'DOI'

    const socket = net.createConnection({ host, port }, () => {
      socket.write('\x3a' + dev + ',' + config.port + ',0,' + node.board.password)
      socket.end()
    })

    socket.on('error', (err) => {
      node.error(`Error: ${err.message}`)
    })
  }

  function SwitchShelly (config, node, msg, cmd) {
    const url = msg.url || `http://${node.board.host}/rpc`
    const headers = {
      'User-Agent': 'nrc-relay-control/' + packageJson.version
    }
    const data = {
      id: config.port,
      method: 'Switch.Set',
      params: {
        id: config.port,
        on: cmd === '1'
      }
    }

    axios.post(url, data, { headers }).then(function (response) {
      if (response.data.error) {
        node.status({ fill: 'red', shape: 'dot', text: response.data.error.message })
      }
    }).catch(function (error) {
      if (error.response && error.message) {
        node.status({ fill: 'red', shape: 'dot', text: error.message })
      } else {
        node.status({ fill: 'red', shape: 'dot', text: 'Error fetching Shelly data' })
      }
    })
  }

  function SwitchTeracom (config, node, msg, cmd) {
    let url = msg.url || `http://${node.board.host}/status.xml`
    const headers = {
      'User-Agent': 'nrc-relay-control/' + packageJson.version
    }

    url += `?r${config.port}=${cmd}`
    axios.get(url, { headers }).then(function (response) {

    }).catch(function (error) {
      if (error.response && error.response.data && error.response.data.errors) {
        node.status({ fill: 'red', shape: 'dot', text: error.response.data.errors })
      } else {
        node.status({ fill: 'red', shape: 'dot', text: 'Error fetching teracom data' })
      }
    })
  }

  function ControlRelayBoardNode (config) {
    RED.nodes.createNode(this, config)
    this.board = RED.nodes.getNode(config.board)
    const node = this

    node.on('input', function (msg) {
      let cmd = ''

      if (typeof (msg.payload) === 'number' && (msg.payload === 0 || msg.payload === 1)) {
        cmd += msg.payload
      }
      if (typeof (msg.payload) === 'boolean') {
        cmd = msg.payload ? '1' : '0'
      }

      if (cmd === '') {
        node.status({ fill: 'red', shape: 'dot', text: 'invalid input' })
        return
      }

      const shape = cmd === '1' ? 'ring' : 'dot'
      const action = cmd === '1' ? 'Active' : 'Inactive'

      switch (node.board.manufacturer) {
        case 'devantech':
          SwitchDevantech(config, node, msg, cmd)
          break
        case 'shelly':
          SwitchShelly(config, node, msg, cmd)
          break
        case 'teracom':
          SwitchTeracom(config, node, msg, cmd)
          break
        default:
          node.status({ fill: 'red', shape: 'dot', text: 'Unknown manufacturer' })
          return
      }

      node.status({ fill: 'green', shape, text: `${action} port ${config.port}` })
    })

    node.on('close', function (done) {
      done()
    })
  }
  RED.nodes.registerType('relay board', ControlRelayBoardNode)
}
